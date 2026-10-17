# booking/services/booking_service.py
from __future__ import annotations

from datetime import timedelta
from decimal import Decimal, InvalidOperation
from typing import Any

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from booking.models import Booking, Passenger
from transport.duffel_client import DuffelError, create_order, get_offer
from transport.flight_mapper import simplify_offer


class BookingServiceError(Exception):
    def __init__(self, message: str, code: str = "booking_error"):
        super().__init__(message)
        self.message = message
        self.code = code


class BookingService:
    DRAFT_TTL_MINUTES = 30

    @staticmethod
    def _parse_decimal(value: Any, field_name: str = "price") -> Decimal:
        try:
            amount = Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError):
            raise BookingServiceError(f"Invalid {field_name}.", code="invalid_price")
        if amount < 0:
            raise BookingServiceError(
                f"{field_name} cannot be negative.", code="invalid_price"
            )
        return amount

    @classmethod
    def _map_title_for_duffel(cls, title: str) -> str:
        t = (title or "").strip().upper()
        if t in ("MR",):
            return "mr"
        if t in ("MRS",):
            return "mrs"
        if t in ("MS", "MISS"):
            return "ms"
        return "mr"

    @classmethod
    def _map_gender_for_duffel(cls, gender: str) -> str:
        g = (gender or "").strip().upper()
        if g in ("M", "MALE"):
            return "m"
        if g in ("F", "FEMALE"):
            return "f"
        return "m"

    # ------------------------------------------------------------------ draft
    @classmethod
    @transaction.atomic
    def create_draft_from_offer(
        cls,
        *,
        user,
        session_key: str,
        offer: dict,
        search_params: dict | None = None,
    ) -> Booking:
        if not offer or not isinstance(offer, dict):
            raise BookingServiceError("Offer data is required.", code="missing_offer")

        raw_id = str(offer.get("id") or "").strip()
        if not raw_id:
            raise BookingServiceError("Offer id is required.", code="missing_offer_id")

        source = (offer.get("source") or "").strip().lower()
        if raw_id.startswith("duffel-"):
            source = source or "duffel"
            provider_offer_id = raw_id.removeprefix("duffel-")
        elif raw_id.startswith("internal-"):
            source = source or "internal"
            provider_offer_id = raw_id.removeprefix("internal-")
        else:
            provider_offer_id = raw_id
            source = source or "duffel"

        price_info = offer.get("price") or {}
        amount = cls._parse_decimal(price_info.get("amount"), "amount")
        currency = (price_info.get("currency") or "USD").strip().upper()[:3]

        origin_code = ""
        destination_code = ""
        departure_at = None
        arrival_at = None
        flight_number = ""
        airline = offer.get("airline") or {}
        airline_name = airline.get("name") or airline.get("code") or ""

        slices = offer.get("slices") or []
        if slices:
            first = slices[0]
            dep = first.get("departure") or {}
            arr = first.get("arrival") or {}
            origin_code = (
                dep.get("airport")
                or (first.get("origin") or {}).get("iata_code")
                or ""
            )
            destination_code = (
                arr.get("airport")
                or (first.get("destination") or {}).get("iata_code")
                or ""
            )
            flight_number = first.get("flight_number") or ""
            if first.get("departure_at"):
                try:
                    departure_at = parse_datetime(first["departure_at"])
                except Exception:
                    pass
            if first.get("arrival_at"):
                try:
                    arrival_at = parse_datetime(first["arrival_at"])
                except Exception:
                    pass

        search_params = search_params or {}
        adults = int(search_params.get("adults") or 1)
        children = int(search_params.get("children") or 0)
        infants = int(search_params.get("infants") or 0)
        if adults < 1:
            adults = 1

        booking = Booking(
            user=user if getattr(user, "is_authenticated", False) else None,
            session_key=session_key or "",
            transport_type=Booking.TransportType.FLIGHT,
            transport_id=provider_offer_id,
            provider=source,
            provider_offer_id=provider_offer_id,
            offer_snapshot=offer,
            origin_code=origin_code[:10],
            destination_code=destination_code[:10],
            departure_at=departure_at,
            arrival_at=arrival_at,
            airline_or_company=airline_name[:200],
            flight_or_trip_number=str(flight_number)[:50],
            adults=adults,
            children=children,
            infants=infants,
            base_price=amount,
            taxes=Decimal("0.00"),
            service_price=Decimal("0.00"),
            total_price=amount,
            currency=currency,
            status=Booking.Status.DRAFT,
            expires_at=timezone.now() + timedelta(minutes=cls.DRAFT_TTL_MINUTES),
        )
        booking.save()
        return booking

    # ------------------------------------------------------------------ access
    @classmethod
    def get_booking_for_request(cls, booking_id: int, request) -> Booking:
        try:
            booking = Booking.objects.prefetch_related("passengers").get(pk=booking_id)
        except Booking.DoesNotExist:
            raise BookingServiceError("Booking not found.", code="not_found")

        if booking.is_expired() and booking.status == Booking.Status.DRAFT:
            booking.status = Booking.Status.EXPIRED
            booking.save(update_fields=["status", "updated_at"])
            raise BookingServiceError(
                "This booking has expired. Please search again.", code="expired"
            )

        user = request.user
        if user.is_authenticated:
            if booking.user_id and booking.user_id != user.id:
                raise BookingServiceError(
                    "You cannot access this booking.", code="forbidden"
                )
        else:
            session_key = request.session.session_key or ""
            if not session_key or booking.session_key != session_key:
                raise BookingServiceError(
                    "You cannot access this booking.", code="forbidden"
                )

        return booking

    # ------------------------------------------------------------------ passengers
    @classmethod
    @transaction.atomic
    def save_passengers_and_contact(
        cls,
        booking: Booking,
        passengers_data: list[dict],
        contact: dict,
    ) -> Booking:
        if booking.status != Booking.Status.DRAFT:
            raise BookingServiceError(
                "Only draft bookings can be edited.", code="invalid_status"
            )

        if booking.is_expired():
            booking.status = Booking.Status.EXPIRED
            booking.save(update_fields=["status", "updated_at"])
            raise BookingServiceError("This booking has expired.", code="expired")

        expected = booking.total_passengers
        if len(passengers_data) != expected:
            raise BookingServiceError(
                f"Expected {expected} passengers, got {len(passengers_data)}.",
                code="passenger_count",
            )

        booking.contact_full_name = (contact.get("contact_full_name") or "").strip()
        booking.contact_email = (contact.get("contact_email") or "").strip()
        booking.contact_phone = (contact.get("contact_phone") or "").strip()

        if not booking.contact_email:
            raise BookingServiceError("Contact email is required.", code="contact_email")
        if not booking.contact_phone:
            raise BookingServiceError("Contact phone is required.", code="contact_phone")

        booking.passengers.all().delete()

        for index, row in enumerate(passengers_data, start=1):
            ptype = (row.get("passenger_type") or "adult").lower()
            if ptype not in ("adult", "child", "infant"):
                ptype = "adult"

            Passenger.objects.create(
                booking=booking,
                order=index,
                passenger_type=ptype,
                title=(row.get("title") or "").strip(),
                first_name=(row.get("first_name") or "").strip(),
                last_name=(row.get("last_name") or "").strip(),
                gender=(row.get("gender") or "").strip(),
                date_of_birth=row.get("date_of_birth") or None,
                nationality=(row.get("nationality") or "").strip()[:2],
                passport_number=(row.get("passport_number") or "").strip(),
                passport_issuing_country=(row.get("passport_issuing_country") or "").strip()[
                    :2
                ],
                passport_expiry=row.get("passport_expiry") or None,
            )

        booking.save(
            update_fields=[
                "contact_full_name",
                "contact_email",
                "contact_phone",
                "updated_at",
            ]
        )
        return booking

    # ------------------------------------------------------------------ revalidate
    @classmethod
    @transaction.atomic
    def revalidate(cls, booking: Booking) -> dict:
        if booking.status not in (
            Booking.Status.DRAFT,
            Booking.Status.PENDING_PAYMENT,
        ):
            raise BookingServiceError(
                "Only draft/pending bookings can be revalidated.",
                code="invalid_status",
            )

        if booking.is_expired():
            booking.status = Booking.Status.EXPIRED
            booking.save(update_fields=["status", "updated_at"])
            raise BookingServiceError("This booking has expired.", code="expired")

        old_amount = booking.total_price
        currency = booking.currency

        if booking.provider == "internal":
            from transport.models import Flight

            try:
                flight_id = int(booking.provider_offer_id or booking.transport_id)
                flight = Flight.objects.get(pk=flight_id)
            except (ValueError, TypeError, Flight.DoesNotExist):
                raise BookingServiceError(
                    "Internal flight no longer available.", code="unavailable"
                )

            if (
                not flight.is_sellable
                or flight.available_seats < booking.total_passengers
            ):
                raise BookingServiceError(
                    "This flight is no longer available.", code="unavailable"
                )

            new_amount = flight.base_price
            booking.base_price = new_amount
            booking.total_price = new_amount
            booking.currency = (flight.currency or currency)[:3]
            snap = dict(booking.offer_snapshot or {})
            snap["price"] = {
                "amount": str(new_amount),
                "currency": booking.currency,
            }
            snap["available_seats"] = flight.available_seats
            booking.offer_snapshot = snap
            booking.save(
                update_fields=[
                    "base_price",
                    "total_price",
                    "currency",
                    "offer_snapshot",
                    "updated_at",
                ]
            )
            changed = new_amount != old_amount
            return {
                "price_changed": changed,
                "old_amount": str(old_amount),
                "new_amount": str(new_amount),
                "currency": booking.currency,
                "available": True,
                "message": "Price has changed." if changed else None,
            }

        if booking.provider == "duffel":
            offer_id = booking.provider_offer_id or booking.transport_id
            if not offer_id:
                raise BookingServiceError(
                    "Missing Duffel offer id.", code="missing_offer_id"
                )

            try:
                raw_offer = get_offer(offer_id)
            except DuffelError as exc:
                if exc.status_code in (404, 422):
                    raise BookingServiceError(
                        "This offer is no longer available. Please search again.",
                        code="unavailable",
                    ) from exc
                raise BookingServiceError(exc.message, code="provider_error") from exc

            new_amount = cls._parse_decimal(
                raw_offer.get("total_amount"), "total_amount"
            )
            new_currency = (raw_offer.get("total_currency") or currency).upper()[:3]
            expires_at = None
            if raw_offer.get("expires_at"):
                expires_at = parse_datetime(raw_offer["expires_at"])

            try:
                simplified = simplify_offer(raw_offer)
            except Exception:
                simplified = dict(booking.offer_snapshot or {})
                simplified["price"] = {
                    "amount": str(new_amount),
                    "currency": new_currency,
                }

            booking.base_price = new_amount
            booking.total_price = new_amount
            booking.currency = new_currency
            booking.offer_snapshot = simplified
            if expires_at:
                booking.expires_at = expires_at
            booking.save(
                update_fields=[
                    "base_price",
                    "total_price",
                    "currency",
                    "offer_snapshot",
                    "expires_at",
                    "updated_at",
                ]
            )
            changed = (new_amount != old_amount) or (new_currency != currency)
            return {
                "price_changed": changed,
                "old_amount": str(old_amount),
                "new_amount": str(new_amount),
                "currency": new_currency,
                "available": True,
                "message": (
                    "Price has been updated by the airline." if changed else None
                ),
            }

        raise BookingServiceError(
            f"Revalidation not supported for provider '{booking.provider}'.",
            code="unsupported_provider",
        )

    # ------------------------------------------------------------------ confirm
    @classmethod
    @transaction.atomic
    def confirm_and_issue(cls, booking: Booking) -> Booking:
        if booking.status not in (
            Booking.Status.DRAFT,
            Booking.Status.PENDING_PAYMENT,
        ):
            raise BookingServiceError(
                "This booking cannot be confirmed in its current status.",
                code="invalid_status",
            )

        if not booking.passengers.exists():
            raise BookingServiceError(
                "Add passengers before confirming.", code="missing_passengers"
            )

        cls.revalidate(booking)
        booking.refresh_from_db()

        # Internal
        if booking.provider == "internal":
            from transport.models import Flight

            try:
                flight_id = int(booking.provider_offer_id or booking.transport_id)
                flight = Flight.objects.select_for_update().get(pk=flight_id)
            except (ValueError, TypeError, Flight.DoesNotExist):
                raise BookingServiceError(
                    "Flight no longer available.", code="unavailable"
                )

            if (
                not flight.is_sellable
                or flight.available_seats < booking.total_passengers
            ):
                raise BookingServiceError("Not enough seats.", code="unavailable")

            Flight.objects.filter(pk=flight.pk).update(
                available_seats=F("available_seats") - booking.total_passengers
            )
            booking.provider_order_id = f"internal-{booking.pk}"
            booking.status = Booking.Status.ISSUED
            booking.save(
                update_fields=["provider_order_id", "status", "updated_at"]
            )
            return booking

        # Duffel
        if booking.provider != "duffel":
            raise BookingServiceError(
                f"Confirm not supported for provider '{booking.provider}'.",
                code="unsupported_provider",
            )

        offer_id = booking.provider_offer_id or booking.transport_id

        try:
            raw_offer = get_offer(offer_id)
        except DuffelError as exc:
            raise BookingServiceError(
                "Offer is no longer available.", code="unavailable"
            ) from exc

        offer_passengers = raw_offer.get("passengers") or []
        our_passengers = list(booking.passengers.order_by("order"))

        if len(offer_passengers) != len(our_passengers):
            raise BookingServiceError(
                "Passenger count does not match the offer.",
                code="passenger_count",
            )

        duffel_passengers = []
        for op, pax in zip(offer_passengers, our_passengers):
            if not pax.date_of_birth:
                raise BookingServiceError(
                    "Date of birth is required for all passengers.",
                    code="missing_dob",
                )
            phone = (booking.contact_phone or "").replace(" ", "")
            row = {
                "id": op["id"],
                "given_name": pax.first_name,
                "family_name": pax.last_name,
                "born_on": pax.date_of_birth.isoformat(),
                "gender": cls._map_gender_for_duffel(pax.gender),
                "title": cls._map_title_for_duffel(pax.title),
                "email": booking.contact_email,
            }
            if phone:
                row["phone_number"] = phone
            duffel_passengers.append(row)

        payments = [
            {
                "type": "balance",
                "amount": str(booking.total_price),
                "currency": booking.currency,
            }
        ]

        try:
            order = create_order(
                offer_id=offer_id,
                passengers=duffel_passengers,
                payments=payments,
                metadata={"booking_id": str(booking.pk)},
            )
        except DuffelError as exc:
            booking.status = Booking.Status.FAILED
            booking.save(update_fields=["status", "updated_at"])
            raise BookingServiceError(
                f"Booking failed: {exc.message}",
                code="provider_error",
            ) from exc

        booking.provider_order_id = order.get("id") or ""
        booking.status = Booking.Status.ISSUED
        snap = dict(booking.offer_snapshot or {})
        snap["order"] = {
            "id": order.get("id"),
            "booking_reference": order.get("booking_reference"),
            "total_amount": order.get("total_amount"),
            "total_currency": order.get("total_currency"),
        }
        booking.offer_snapshot = snap
        booking.save(
            update_fields=[
                "provider_order_id",
                "status",
                "offer_snapshot",
                "updated_at",
            ]
        )
        return booking