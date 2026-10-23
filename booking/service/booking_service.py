# booking/service/booking_service.py
from __future__ import annotations

from datetime import timedelta, date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any
import re

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from booking.models import Booking, Passenger
from transport.duffel_client import DuffelError, create_order, get_offer


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

    @classmethod
    @transaction.atomic
    def create_draft_from_offer(
        cls, *, user, session_key: str, offer: dict, search_params: dict | None = None
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
            first = slices[0] or {}
            dep = first.get("departure") or {}
            arr = first.get("arrival") or {}
            origin_code = (dep.get("airport") or dep.get("iata") or "")[:10]
            destination_code = (arr.get("airport") or arr.get("iata") or "")[:10]
            if dep.get("at"):
                departure_at = parse_datetime(str(dep.get("at")))
            elif dep.get("date") and dep.get("time"):
                departure_at = parse_datetime(f"{dep.get('date')}T{dep.get('time')}:00")
            if arr.get("at"):
                arrival_at = parse_datetime(str(arr.get("at")))
            flight_number = str(first.get("flight_number") or "")[:200]
        params = search_params or {}
        adults = max(1, int(params.get("adults") or offer.get("adults") or 1))
        children = max(0, int(params.get("children") or offer.get("children") or 0))
        infants = max(0, int(params.get("infants") or offer.get("infants") or 0))
        expires_at = timezone.now() + timedelta(minutes=cls.DRAFT_TTL_MINUTES)
        return Booking.objects.create(
            user=user if getattr(user, "is_authenticated", False) else None,
            transport_type=Booking.TransportType.FLIGHT,
            transport_id=provider_offer_id[:128],
            provider=source[:30],
            provider_offer_id=provider_offer_id[:128],
            offer_snapshot=offer if isinstance(offer, dict) else {},
            origin_code=origin_code or None,
            destination_code=destination_code or None,
            departure_at=departure_at,
            arrival_at=arrival_at,
            airline_or_company=airline_name[:200] or None,
            flight_or_trip_number=flight_number or None,
            adults=adults,
            children=children,
            infants=infants,
            base_price=amount,
            taxes=Decimal("0.00"),
            service_price=Decimal("0.00"),
            total_price=amount,
            currency=currency,
            status=Booking.Status.DRAFT,
            session_key=(session_key or "")[:40],
            expires_at=expires_at,
        )

    @classmethod
    def get_booking_for_request(cls, booking_id: int, request) -> Booking:
        try:
            booking = Booking.objects.prefetch_related("passengers").get(pk=booking_id)
        except Booking.DoesNotExist:
            raise BookingServiceError("Booking not found.", code="not_found")
        if booking.is_expired() and booking.status == Booking.Status.DRAFT:
            booking.status = Booking.Status.EXPIRED
            booking.save(update_fields=["status", "updated_at"])
            raise BookingServiceError("This booking has expired.", code="expired")
        user = request.user
        session_key = request.session.session_key or ""
        if booking.user_id:
            if not user.is_authenticated or booking.user_id != user.id:
                raise BookingServiceError("Access denied.", code="forbidden")
        else:
            if session_key and booking.session_key and booking.session_key != session_key:
                if not user.is_authenticated:
                    raise BookingServiceError("Access denied.", code="forbidden")
        return booking

    @classmethod
    @transaction.atomic
    def save_passengers_and_contact(cls, booking: Booking, passengers_data: list[dict], contact: dict) -> Booking:
        if booking.status != Booking.Status.DRAFT:
            raise BookingServiceError("Only draft bookings can be edited.", code="invalid_status")
        if booking.is_expired():
            booking.status = Booking.Status.EXPIRED
            booking.save(update_fields=["status", "updated_at"])
            raise BookingServiceError("This booking has expired.", code="expired")
        expected = booking.total_passengers
        if len(passengers_data) != expected:
            raise BookingServiceError(
                f"Expected {expected} passengers, got {len(passengers_data)}.", code="passenger_count"
            )
        email_re = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$", re.I)
        latin_name_re = re.compile(r"^[A-Za-z]+(?:[ \-'.][A-Za-z]+)*$")
        passport_re = re.compile(r"^[A-Za-z0-9]{6,12}$")
        iso2_re = re.compile(r"^[A-Za-z]{2}$")

        def digits_only(s: str) -> str:
            return re.sub(r"\D", "", s or "")

        def parse_date(value):
            if value is None or value == "":
                return None
            if isinstance(value, date) and not isinstance(value, datetime):
                return value
            try:
                return date.fromisoformat(str(value).strip()[:10])
            except ValueError:
                return None

        def age_on(today: date, dob: date) -> int:
            years = today.year - dob.year
            if (today.month, today.day) < (dob.month, dob.day):
                years -= 1
            return years

        def iran_national_id_ok(code: str) -> bool:
            if not re.fullmatch(r"\d{10}", code):
                return False
            if code == code[0] * 10:
                return False
            check = int(code[9])
            total = sum(int(code[i]) * (10 - i) for i in range(9)) % 11
            return (total < 2 and check == total) or (total >= 2 and check + total == 11)

        full_name = (contact.get("contact_full_name") or "").strip()
        email = (contact.get("contact_email") or "").strip().lower()
        phone_raw = (contact.get("contact_phone") or "").strip()
        phone_digits = digits_only(phone_raw)
        if len(full_name) < 2:
            raise BookingServiceError("Contact name is required (min 2 characters).", code="contact_name")
        if not email_re.match(email) or len(email) > 254:
            raise BookingServiceError("Enter a valid email address.", code="contact_email")
        if len(phone_digits) < 7 or len(phone_digits) > 15:
            raise BookingServiceError("Mobile number must contain 7 to 15 digits.", code="contact_phone")
        booking.contact_full_name = full_name[:200]
        booking.contact_email = email[:254]
        booking.contact_phone = phone_raw[:20]
        today = timezone.now().date()
        m = today.month + 6
        y = today.year + (m - 1) // 12
        m = (m - 1) % 12 + 1
        mdays = [31, 29 if y % 4 == 0 and (y % 100 != 0 or y % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        min_passport_expiry = date(y, m, min(today.day, mdays[m - 1]))
        booking.passengers.all().delete()
        for index, row in enumerate(passengers_data, start=1):
            ptype = (row.get("passenger_type") or "adult").lower()
            if ptype not in ("adult", "child", "infant"):
                ptype = "adult"
            first_name = (row.get("first_name") or "").strip()
            last_name = (row.get("last_name") or "").strip()
            gender = (row.get("gender") or "").strip().upper()
            nationality = (row.get("nationality") or "").strip().upper()[:2]
            national_id = (row.get("national_id") or "").strip()
            passport_number = (row.get("passport_number") or "").strip().upper()
            passport_country = (row.get("passport_issuing_country") or "").strip().upper()[:2]
            dob = parse_date(row.get("date_of_birth"))
            passport_expiry = parse_date(row.get("passport_expiry"))
            if not latin_name_re.match(first_name) or not (2 <= len(first_name) <= 100):
                raise BookingServiceError(f"Passenger {index}: given names must be Latin letters only (min 2).", code="first_name")
            if not latin_name_re.match(last_name) or not (2 <= len(last_name) <= 100):
                raise BookingServiceError(f"Passenger {index}: last name must be Latin letters only (min 2).", code="last_name")
            if gender not in ("M", "F"):
                raise BookingServiceError(f"Passenger {index}: gender is required (M or F).", code="gender")
            if not dob:
                raise BookingServiceError(f"Passenger {index}: valid date of birth is required.", code="date_of_birth")
            if dob > today:
                raise BookingServiceError(f"Passenger {index}: date of birth cannot be in the future.", code="date_of_birth")
            age = age_on(today, dob)
            if ptype == "adult" and age < 12:
                raise BookingServiceError(f"Passenger {index}: adult must be 12 years or older.", code="age")
            if ptype == "child" and not (2 <= age <= 11):
                raise BookingServiceError(f"Passenger {index}: child must be between 2 and 11 years.", code="age")
            if ptype == "infant" and age >= 2:
                raise BookingServiceError(f"Passenger {index}: infant must be under 2 years.", code="age")
            if not iso2_re.match(nationality):
                raise BookingServiceError(f"Passenger {index}: nationality is required.", code="nationality")
            if national_id:
                if nationality == "IR":
                    if not iran_national_id_ok(national_id):
                        raise BookingServiceError(f"Passenger {index}: invalid Iranian national ID.", code="national_id")
                elif not re.fullmatch(r"[A-Za-z0-9\-]{5,20}", national_id):
                    raise BookingServiceError(f"Passenger {index}: invalid national ID format.", code="national_id")
            if ptype != "infant":
                if not passport_re.match(passport_number):
                    raise BookingServiceError(f"Passenger {index}: passport number must be 6-12 alphanumeric characters.", code="passport_number")
                if not iso2_re.match(passport_country):
                    raise BookingServiceError(f"Passenger {index}: passport issuing country is required.", code="passport_country")
                if not passport_expiry:
                    raise BookingServiceError(f"Passenger {index}: passport expiry date is required.", code="passport_expiry")
                if passport_expiry < today:
                    raise BookingServiceError(f"Passenger {index}: passport has expired.", code="passport_expiry")
                if passport_expiry < min_passport_expiry:
                    raise BookingServiceError(f"Passenger {index}: passport must remain valid for at least 6 months.", code="passport_expiry")
            Passenger.objects.create(
                booking=booking, order=index, passenger_type=ptype,
                title=(row.get("title") or "").strip()[:10],
                first_name=first_name[:100], last_name=last_name[:100], gender=gender,
                date_of_birth=dob, nationality=nationality,
                passport_number=passport_number[:30] if ptype != "infant" else "",
                passport_issuing_country=passport_country if ptype != "infant" else "",
                passport_expiry=passport_expiry if ptype != "infant" else None,
                is_adult=(ptype == "adult"), is_child=(ptype == "child"), is_infant=(ptype == "infant"),
            )
        booking.save(update_fields=["contact_full_name", "contact_email", "contact_phone", "updated_at"])
        return booking

    @classmethod
    @transaction.atomic
    def save_travel_services(cls, booking: Booking, payload: dict) -> Booking:
        if booking.status != Booking.Status.DRAFT:
            raise BookingServiceError("Only draft bookings can be edited.", code="invalid_status")
        if booking.is_expired():
            booking.status = Booking.Status.EXPIRED
            booking.save(update_fields=["status", "updated_at"])
            raise BookingServiceError("This booking has expired.", code="expired")
        baggage = payload.get("baggage") or []
        seats = payload.get("seats") or []
        extras = payload.get("extras") or {}
        try:
            service_amount = Decimal(str(payload.get("service_amount") or "0"))
        except (InvalidOperation, TypeError, ValueError):
            raise BookingServiceError("Invalid service amount.", code="invalid_price")
        if service_amount < 0:
            raise BookingServiceError("Service amount cannot be negative.", code="invalid_price")
        if service_amount > Decimal("5000"):
            raise BookingServiceError("Service amount is too high.", code="invalid_price")
        snap = dict(booking.offer_snapshot or {})
        snap["selected_services"] = {
            "baggage": baggage,
            "seats": seats,
            "extras": extras,
            "skipped": bool(payload.get("skipped")),
            "service_amount": str(service_amount),
            "currency": (payload.get("currency") or booking.currency or "USD")[:3],
        }
        booking.offer_snapshot = snap
        booking.service_price = service_amount
        booking.total_price = (booking.base_price or Decimal("0")) + (booking.taxes or Decimal("0")) + service_amount
        booking.save(update_fields=["offer_snapshot", "service_price", "total_price", "updated_at"])
        return booking

    @classmethod
    def revalidate(cls, booking: Booking) -> dict:
        if booking.status not in (Booking.Status.DRAFT, Booking.Status.PENDING_PAYMENT):
            raise BookingServiceError("Booking cannot be revalidated in this status.", code="invalid_status")
        if booking.is_expired():
            booking.status = Booking.Status.EXPIRED
            booking.save(update_fields=["status", "updated_at"])
            raise BookingServiceError("This booking has expired.", code="expired")
        old_amount = booking.total_price
        currency = booking.currency
        if booking.provider == "duffel" and booking.provider_offer_id:
            try:
                fresh = get_offer(booking.provider_offer_id)
            except DuffelError as exc:
                raise BookingServiceError(str(exc) or "Offer is no longer available.", code="unavailable") from exc
            price = (fresh or {}).get("total_amount") or (fresh or {}).get("amount")
            if price is None and isinstance(fresh, dict):
                price = (fresh.get("price") or {}).get("amount")
            new_amount = cls._parse_decimal(price or old_amount, "amount")
            new_currency = (fresh or {}).get("total_currency") or (fresh or {}).get("currency") or currency
            if isinstance(fresh, dict) and fresh.get("price"):
                new_currency = fresh["price"].get("currency") or new_currency
            price_changed = new_amount != old_amount
            if price_changed:
                booking.base_price = new_amount
                booking.total_price = new_amount + (booking.service_price or Decimal("0"))
                booking.currency = str(new_currency)[:3]
                booking.save(update_fields=["base_price", "total_price", "currency", "updated_at"])
            return {
                "price_changed": price_changed,
                "old_amount": str(old_amount),
                "new_amount": str(booking.total_price),
                "currency": booking.currency,
                "message": "Price updated." if price_changed else None,
            }
        return {
            "price_changed": False,
            "old_amount": str(old_amount),
            "new_amount": str(old_amount),
            "currency": currency,
            "message": None,
        }

    @classmethod
    @transaction.atomic
    def prepare_for_payment(cls, booking: Booking) -> dict:
        if booking.status == Booking.Status.PENDING_PAYMENT:
            return {
                "booking": booking,
                "price_info": {
                    "price_changed": False,
                    "old_amount": str(booking.total_price),
                    "new_amount": str(booking.total_price),
                    "currency": booking.currency,
                    "message": None,
                },
            }
        if booking.status != Booking.Status.DRAFT:
            raise BookingServiceError(
                "Booking cannot enter payment in this status.",
                code="invalid_status",
            )
        if booking.is_expired():
            booking.status = Booking.Status.EXPIRED
            booking.save(update_fields=["status", "updated_at"])
            raise BookingServiceError("This booking has expired.", code="expired")
        if not booking.passengers.exists():
            raise BookingServiceError(
                "Passenger details are required before payment.",
                code="missing_passengers",
            )
        if not (booking.contact_email or "").strip():
            raise BookingServiceError(
                "Contact details are required before payment.",
                code="missing_contact",
            )
        price_info = cls.revalidate(booking)
        booking.refresh_from_db()
        booking.status = Booking.Status.PENDING_PAYMENT
        booking.expires_at = timezone.now() + timedelta(minutes=cls.DRAFT_TTL_MINUTES)
        booking.save(update_fields=["status", "expires_at", "updated_at"])
        return {"booking": booking, "price_info": price_info}

    @classmethod
    @transaction.atomic
    def mark_paid(
        cls,
        booking: Booking,
        payment_ref: str = "",
        payment_authority: str = "",
    ) -> Booking:
        if booking.status == Booking.Status.ISSUED:
            return booking
        if booking.status == Booking.Status.PAID:
            return cls.confirm_and_issue(booking)
        if booking.status != Booking.Status.PENDING_PAYMENT:
            raise BookingServiceError(
                "Booking is not awaiting payment.",
                code="invalid_status",
            )
        if booking.is_expired():
            booking.status = Booking.Status.EXPIRED
            booking.save(update_fields=["status", "updated_at"])
            raise BookingServiceError("This booking has expired.", code="expired")
        booking.status = Booking.Status.PAID
        if payment_ref:
            booking.payment_ref = str(payment_ref)[:100]
        if payment_authority:
            booking.payment_authority = str(payment_authority)[:100]
        booking.save(
            update_fields=["status", "payment_ref", "payment_authority", "updated_at"]
        )
        return cls.confirm_and_issue(booking)

    @classmethod
    @transaction.atomic
    def confirm_and_issue(cls, booking: Booking) -> Booking:
        if booking.status == Booking.Status.ISSUED:
            return booking
        if booking.status != Booking.Status.PAID:
            raise BookingServiceError(
                "Payment is required before ticket issuance.",
                code="payment_required",
            )
        if booking.is_expired():
            raise BookingServiceError("This booking has expired.", code="expired")
        if not booking.passengers.exists():
            raise BookingServiceError("Passenger details are required before confirmation.", code="missing_passengers")
        if booking.provider == "duffel" and booking.provider_offer_id:
            passengers_payload = []
            for p in booking.passengers.all():
                passengers_payload.append({
                    "type": p.passenger_type or "adult",
                    "title": cls._map_title_for_duffel(p.title),
                    "given_name": p.first_name,
                    "family_name": p.last_name,
                    "gender": cls._map_gender_for_duffel(p.gender or ""),
                    "born_on": p.date_of_birth.isoformat() if p.date_of_birth else None,
                })
            try:
                order = create_order(
                    offer_id=booking.provider_offer_id,
                    passengers=passengers_payload,
                    contact={"email": booking.contact_email, "phone": booking.contact_phone},
                )
            except DuffelError as exc:
                booking.status = Booking.Status.FAILED
                booking.save(update_fields=["status", "updated_at"])
                raise BookingServiceError(str(exc) or "Could not issue ticket.", code="unavailable") from exc
            booking.provider_order_id = str((order or {}).get("id") or (order or {}).get("order_id") or "")[:128]
            snap = dict(booking.offer_snapshot or {})
            snap["order"] = order or {}
            booking.offer_snapshot = snap
            booking.status = Booking.Status.ISSUED
            booking.save(update_fields=["provider_order_id", "offer_snapshot", "status", "updated_at"])
            return booking
        booking.status = Booking.Status.ISSUED
        booking.save(update_fields=["status", "updated_at"])
        return booking
