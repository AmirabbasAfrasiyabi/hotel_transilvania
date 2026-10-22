# booking/service/payment_gate.py
"""
P0 payment gate: attach prepare_for_payment / mark_paid to BookingService
and block ticket issuance until PAID. Also persist national_id/document_type.
"""
from __future__ import annotations

from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from booking.models import Booking, Passenger
from transport.duffel_client import DuffelError, create_order


def install(BookingService, BookingServiceError):
    """Mutate BookingService class in place with P0 payment methods."""

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
    def confirm_and_issue(cls, booking: Booking) -> Booking:
        if booking.status == Booking.Status.ISSUED:
            return booking
        if booking.status != Booking.Status.PAID:
            raise BookingServiceError(
                "Booking must be paid before ticket issuance.",
                code="payment_required",
            )
        if booking.is_expired():
            raise BookingServiceError("This booking has expired.", code="expired")
        if not booking.passengers.exists():
            raise BookingServiceError(
                "Passenger details are required before confirmation.",
                code="missing_passengers",
            )
        if booking.provider == "duffel" and booking.provider_offer_id:
            passengers_payload = []
            for p in booking.passengers.all():
                passengers_payload.append(
                    {
                        "type": p.passenger_type or "adult",
                        "title": cls._map_title_for_duffel(p.title),
                        "given_name": p.first_name,
                        "family_name": p.last_name,
                        "gender": cls._map_gender_for_duffel(p.gender or ""),
                        "born_on": p.date_of_birth.isoformat() if p.date_of_birth else None,
                    }
                )
            try:
                order = create_order(
                    offer_id=booking.provider_offer_id,
                    passengers=passengers_payload,
                    contact={
                        "email": booking.contact_email,
                        "phone": booking.contact_phone,
                    },
                )
            except DuffelError as exc:
                booking.status = Booking.Status.FAILED
                booking.save(update_fields=["status", "updated_at"])
                raise BookingServiceError(
                    str(exc) or "Could not issue ticket.",
                    code="unavailable",
                ) from exc
            booking.provider_order_id = str(
                (order or {}).get("id") or (order or {}).get("order_id") or ""
            )[:128]
            snap = dict(booking.offer_snapshot or {})
            snap["order"] = order or {}
            booking.offer_snapshot = snap
            booking.status = Booking.Status.ISSUED
            booking.save(
                update_fields=[
                    "provider_order_id",
                    "offer_snapshot",
                    "status",
                    "updated_at",
                ]
            )
            return booking
        booking.status = Booking.Status.ISSUED
        booking.save(update_fields=["status", "updated_at"])
        return booking

    @classmethod
    @transaction.atomic
    def mark_paid(
        cls,
        booking: Booking,
        *,
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

    BookingService.prepare_for_payment = prepare_for_payment
    BookingService.confirm_and_issue = confirm_and_issue
    BookingService.mark_paid = mark_paid

    # Persist national_id / document_type after original passenger save
    _orig_save = BookingService.save_passengers_and_contact.__func__

    @classmethod
    @transaction.atomic
    def save_passengers_and_contact(cls, booking, passengers_data, contact):
        booking = _orig_save(cls, booking, passengers_data, contact)
        for index, row in enumerate(passengers_data, start=1):
            national_id = (row.get("national_id") or "").strip()
            passport_number = (row.get("passport_number") or "").strip().upper()
            doc_type = (row.get("document_type") or "").strip()
            if not doc_type:
                if national_id and not passport_number:
                    doc_type = Passenger.DocumentType.NATIONAL_ID
                elif passport_number:
                    doc_type = Passenger.DocumentType.PASSPORT
            try:
                p = booking.passengers.get(order=index)
            except Passenger.DoesNotExist:
                continue
            updates = []
            if national_id and getattr(p, "national_id", "") != national_id[:20]:
                p.national_id = national_id[:20]
                updates.append("national_id")
            if doc_type and getattr(p, "document_type", "") != doc_type[:20]:
                p.document_type = doc_type[:20]
                updates.append("document_type")
            if updates:
                p.save(update_fields=updates)
        return booking

    BookingService.save_passengers_and_contact = save_passengers_and_contact
