from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class Booking(models.Model):
    class TransportType(models.TextChoices):
        FLIGHT = "F", "Flight"
        TRAIN = "T", "Train"
        BUS = "B", "Bus"
        HOTEL = "H", "Hotel"

    class Status(models.TextChoices):
        DRAFT = "D", "Draft"
        PENDING_PAYMENT = "P", "Payment"
        PAID = "A", "Paid"
        ISSUED = "I", "Issued"
        CANCELLED = "C", "Cancelled"
        EXPIRED = "E", "Expired"
        FAILED = "F", "Failed"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="booking_user",
    )
    transport_type = models.CharField(
        choices=TransportType.choices,
        max_length=10,
        default=TransportType.FLIGHT,
    )
    transport_id = models.CharField(max_length=128, blank=True)
    provider = models.CharField(max_length=30, blank=True)
    provider_offer_id = models.CharField(max_length=128, blank=True, db_index=True)
    provider_order_id = models.CharField(max_length=128, blank=True, db_index=True)
    offer_snapshot = models.JSONField(default=dict, blank=True)
    origin_code = models.CharField(max_length=10, blank=True, null=True)
    destination_code = models.CharField(max_length=10, blank=True, null=True)
    departure_at = models.DateTimeField(null=True, blank=True)
    arrival_at = models.DateTimeField(null=True, blank=True)
    airline_or_company = models.CharField(max_length=200, blank=True, null=True)
    flight_or_trip_number = models.CharField(max_length=200, blank=True, null=True)

    adults = models.PositiveIntegerField(default=1)
    children = models.PositiveIntegerField(default=0)
    infants = models.PositiveIntegerField(default=0)

    base_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    taxes = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    service_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    total_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    currency = models.CharField(max_length=3, default="USD")
    status = models.CharField(
        max_length=2,
        choices=Status.choices,
        default=Status.DRAFT,
        verbose_name="status",
    )

    contact_full_name = models.CharField(max_length=200, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)

    # Payment tracking (for gateway callback)
    payment_ref = models.CharField(max_length=100, blank=True, db_index=True)
    payment_authority = models.CharField(max_length=100, blank=True)

    session_key = models.CharField(max_length=40, blank=True, db_index=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Booking"
        verbose_name_plural = "Bookings"
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["session_key"]),
            models.Index(fields=["transport_type", "transport_id"]),
        ]

    def __str__(self):
        return f"Booking #{self.id} | {self.get_transport_type_display()} | {self.status}"

    @property
    def total_passengers(self):
        return self.adults + self.children + self.infants

    def is_expired(self):
        if self.expires_at and timezone.now() > self.expires_at:
            return True
        return False

    def recalculate_total(self):
        self.total_price = self.base_price + self.taxes + self.service_price
        self.save(update_fields=["total_price", "updated_at"])


class Passenger(models.Model):
    class Gender(models.TextChoices):
        MALE = "M", "Male"
        FEMALE = "F", "Female"
        OTHER = "O", "Other"

    class DocumentType(models.TextChoices):
        NATIONAL_ID = "national_id", "National ID"
        PASSPORT = "passport", "Passport"

    booking = models.ForeignKey(
        Booking, on_delete=models.CASCADE, related_name="passengers"
    )
    order = models.PositiveIntegerField(default=1)
    passenger_type = models.CharField(max_length=10, default="adult", blank=True)
    title = models.CharField(max_length=10, blank=True)
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    gender = models.CharField(
        max_length=10, choices=Gender.choices, blank=True, null=True
    )
    date_of_birth = models.DateField(null=True, blank=True)
    nationality = models.CharField(max_length=100, blank=True, null=True)

    # Document fields (shared architecture for domestic / international)
    document_type = models.CharField(
        max_length=20,
        choices=DocumentType.choices,
        blank=True,
        default="",
    )
    national_id = models.CharField(max_length=20, blank=True, verbose_name="National ID")
    passport_number = models.CharField(max_length=30, blank=True)
    passport_issuing_country = models.CharField(max_length=100, blank=True)
    passport_expiry = models.DateField(null=True, blank=True)

    is_adult = models.BooleanField(default=True)
    is_child = models.BooleanField(default=False)
    is_infant = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order"]
        verbose_name = "Passenger"
        verbose_name_plural = "Passengers"
        unique_together = [["booking", "order"]]

    def __str__(self):
        return f"Passenger #{self.order} | {self.first_name} | {self.last_name}"
