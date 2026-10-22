"""Tests for booking P0 safety fixes: passenger fields, payment gate, issuance."""
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, RequestFactory
from django.utils import timezone

from booking.models import Booking, Passenger
from booking.service.booking_service import BookingService, BookingServiceError


User = get_user_model()


def _valid_passenger(**overrides):
    base = {
        "passenger_type": "adult",
        "title": "MR",
        "first_name": "Ali",
        "last_name": "Rezaei",
        "gender": "M",
        "date_of_birth": "1990-05-15",
        "nationality": "IR",
        "document_type": "passport",
        "national_id": "",
        "passport_number": "A1234567",
        "passport_issuing_country": "IR",
        "passport_expiry": (date.today() + timedelta(days=400)).isoformat(),
    }
    base.update(overrides)
    return base


def _valid_contact(**overrides):
    base = {
        "contact_full_name": "Ali Rezaei",
        "contact_email": "ali@example.com",
        "contact_phone": "09121234567",
    }
    base.update(overrides)
    return base


class BookingServiceP0Tests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="booker", email="booker@example.com", password="pass12345"
        )
        self.factory = RequestFactory()

    def _make_draft(self, **kwargs):
        defaults = dict(
            user=self.user,
            transport_type=Booking.TransportType.FLIGHT,
            provider="internal",
            provider_offer_id="offer-1",
            adults=1,
            children=0,
            infants=0,
            base_price=Decimal("100.00"),
            total_price=Decimal("100.00"),
            currency="USD",
            status=Booking.Status.DRAFT,
            session_key="testsessionkey123456789012345678",
            expires_at=timezone.now() + timedelta(minutes=30),
            offer_snapshot={"id": "internal-1", "price": {"amount": "100", "currency": "USD"}},
        )
        defaults.update(kwargs)
        return Booking.objects.create(**defaults)

    def test_save_passengers_persists_national_id_and_document_type(self):
        booking = self._make_draft()
        national_id = "AB-12345"
        passengers = [
            _valid_passenger(
                nationality="TR",
                document_type="national_id",
                national_id=national_id,
                passport_number="B9876543",
                passport_issuing_country="TR",
            )
        ]
        BookingService.save_passengers_and_contact(
            booking, passengers, _valid_contact()
        )
        p = booking.passengers.get()
        self.assertEqual(p.national_id, national_id)
        self.assertEqual(p.document_type, "national_id")
        self.assertEqual(p.passport_number, "B9876543")
        self.assertEqual(booking.contact_email, "ali@example.com")

    def test_passenger_count_mismatch_rejected(self):
        booking = self._make_draft(adults=2)
        with self.assertRaises(BookingServiceError) as ctx:
            BookingService.save_passengers_and_contact(
                booking, [_valid_passenger()], _valid_contact()
            )
        self.assertEqual(ctx.exception.code, "passenger_count")

    def test_prepare_for_payment_sets_pending_and_does_not_issue(self):
        booking = self._make_draft(provider="internal")
        BookingService.save_passengers_and_contact(
            booking, [_valid_passenger()], _valid_contact()
        )
        with patch.object(
            BookingService,
            "revalidate",
            return_value={
                "price_changed": False,
                "old_amount": "100.00",
                "new_amount": "100.00",
                "currency": "USD",
                "message": None,
            },
        ):
            result = BookingService.prepare_for_payment(booking)

        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.PENDING_PAYMENT)
        self.assertEqual(result["booking"].status, Booking.Status.PENDING_PAYMENT)
        self.assertFalse(booking.provider_order_id)

    def test_confirm_and_issue_rejects_draft_without_payment(self):
        booking = self._make_draft()
        BookingService.save_passengers_and_contact(
            booking, [_valid_passenger()], _valid_contact()
        )
        with self.assertRaises(BookingServiceError) as ctx:
            BookingService.confirm_and_issue(booking)
        self.assertEqual(ctx.exception.code, "payment_required")
        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.DRAFT)

    def test_confirm_and_issue_rejects_pending_payment(self):
        booking = self._make_draft(status=Booking.Status.DRAFT)
        BookingService.save_passengers_and_contact(
            booking, [_valid_passenger()], _valid_contact()
        )
        booking.status = Booking.Status.PENDING_PAYMENT
        booking.save(update_fields=["status"])
        with self.assertRaises(BookingServiceError) as ctx:
            BookingService.confirm_and_issue(booking)
        self.assertEqual(ctx.exception.code, "payment_required")

    def test_mark_paid_issues_internal_booking(self):
        booking = self._make_draft(provider="internal", status=Booking.Status.PENDING_PAYMENT)
        booking.status = Booking.Status.DRAFT
        booking.save(update_fields=["status"])
        BookingService.save_passengers_and_contact(
            booking, [_valid_passenger()], _valid_contact()
        )
        booking.status = Booking.Status.PENDING_PAYMENT
        booking.save(update_fields=["status"])

        issued = BookingService.mark_paid(
            booking, payment_ref="TXN-1", payment_authority="AUTH-1"
        )
        self.assertEqual(issued.status, Booking.Status.ISSUED)
        self.assertEqual(issued.payment_ref, "TXN-1")
        self.assertEqual(issued.payment_authority, "AUTH-1")

    def test_mark_paid_idempotent_when_already_issued(self):
        booking = self._make_draft(provider="internal", status=Booking.Status.ISSUED)
        again = BookingService.mark_paid(booking, payment_ref="X")
        self.assertEqual(again.status, Booking.Status.ISSUED)

    def test_prepare_for_payment_requires_passengers(self):
        booking = self._make_draft()
        with self.assertRaises(BookingServiceError) as ctx:
            BookingService.prepare_for_payment(booking)
        self.assertEqual(ctx.exception.code, "missing_passengers")
