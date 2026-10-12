# transport/models.py
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, RegexValidator, MinLengthValidator
from django.db import models
from django.db.models import CheckConstraint, Q, UniqueConstraint, F
from django.utils import timezone

class Airline(models.Model):
    name = models.CharField(max_length=200 , verbose_name="Airline Name")
    iata_code = models.CharField(max_length=3,unique=True, validators=[RegexValidator(r'^[A-Z0-9]{2,3}$', "code IATA is validate")], verbose_name="IATA Code")
    icao_code = models.CharField(max_length=4,blank=True, null=True,validators=[RegexValidator(r'^[A-Z]{3,4}$', "ICAO Code is validate")], verbose_name="ICAO Code")

    logo = models.ImageField(upload_to="airlines/logos",blank=True,null=True, verbose_name="Logo")
    is_active = models.BooleanField(default=True, verbose_name="Is Active")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created Date")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated Date")

    class Meta:
        ordering = ['name']
        verbose_name = "Airline"
        verbose_name_plural = "Airlines"

    def __str__(self):
        return f"{self.name} ({self.iata_code})"

class Airport(models.Model):
    name = models.CharField(max_length=200 , verbose_name="Airport Name")
    iata_code = models.CharField(max_length=3, unique=True,validators=[RegexValidator(r'^[A-Z]{3}$', "code IATA must have 3 harf ")],verbose_name="IATA Code")
    icao_code = models.CharField(max_length=4, blank=True, null=True,validators=[RegexValidator(r'^[A-Z]{4}$', "ICAO Code  must have 4 harf")],verbose_name="ICAO Code")
    city = models.CharField(max_length=100 , verbose_name="City")
    country = models.CharField(max_length=100 , verbose_name="Country")
    timezone = models.CharField(max_length=100 , verbose_name="Timezone")
    is_active = models.BooleanField(default=True, verbose_name="Is Active")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created Date")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated Date")

    class Meta:
        ordering = ['name','city']
        verbose_name = "Airport"
        verbose_name_plural = "Airports"
        indexes = [
            models.Index(fields=["iata_code"]),
            models.Index(fields=["city"]),
        ]
    def __str__(self):
        return f"{self.name} ({self.iata_code})"


class Flight(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "scheduled"
        ON_SALE = "on_sale", "on_sale"
        CLOSED = "closed", "closed"
        CANCELLED = "cancelled", "cancelled"
        DEPARTED = "departed", "departed"
        ARRIVED = "arrived", "arrived"

    class TripType(models.TextChoices):
        ONE_WAY = "one_way", "one_way"
        ROUND_TRIP = "round_trip",


    airline = models.ForeignKey(Airline, on_delete=models.CASCADE, verbose_name="Airline")
    flight_number = models.CharField(max_length=10,verbose_name="Flight Number")
    origin = models.ForeignKey(Airport, on_delete=models.CASCADE, related_name="departures",verbose_name="Origin")
    description = models.ForeignKey(Airport, on_delete=models.CASCADE, related_name="arrivals",verbose_name="Description")
    trip_type = models.CharField(max_length=10,choices=TripType.choices,default=TripType.ONE_WAY,verbose_name="Trip Type",)
    departure_at = models.DateTimeField(verbose_name="Departure Time")
    arrival_at = models.DateTimeField(verbose_name="Arrival Time")
    base_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0.00"))], verbose_name="Base Price")
    currency = models.CharField(max_length=10, verbose_name="Currency")
    total_capacity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)],verbose_name="Total Capacity")
    available_seats = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)],verbose_name="Available Seats")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.SCHEDULED,verbose_name="Status")
    baggage_allowance = models.CharField(max_length=100,blank=True,default="20kg",verbose_name="Baggage Allowance")
    refound_policy = models.TextField(blank=True,verbose_name="Refound Policy",)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created Date")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated Date")
    is_active = models.BooleanField(default=True,verbose_name="Active")

    class Meta:
        ordering = ['departure_at']
        verbose_name = "Flight"
        verbose_name_plural = "Flights"
        indexes = [
            models.Index(fields=["origin", "description", "departure_at"]),
            models.Index(fields=["status", "departure_at"]),
            models.Index(fields=["departure_at"]),
            models.Index(fields=["airline", "flight_number", "departure_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["airline", "flight_number", "departure_at"],
                name="unique_flight_instance"
            ),
            models.CheckConstraint(
                check=Q(arrival_at__gt=F("departure_at")),
                name="arrival_after_departure"
            ),
            models.CheckConstraint(
                check=Q(available_seats__lte=F("total_capacity")),
                name="available_le_total"
            ),
            models.CheckConstraint(
                check=Q(base_price__gte=0),
                name="price_non_negative"
            ),
        ]

    def __str__(self):
        return (
            f"{self.airline.iata_code}{self.flight_number} | "
            f"{self.origin.iata_code} → "
            f"{self.description.iata_code}"
        )

    def clean(self):
        super().clean()

        if (
                self.origin_id
                and self.description_id
                and self.origin_id == self.description_id
        ):
            raise ValidationError({
                "description": (
                    "Origin and destination cannot be the same airport."
                )
            })

        if (
                self.departure_at
                and self.arrival_at
                and self.arrival_at <= self.departure_at
        ):
            raise ValidationError({
                "arrival_at": "Arrival time must be after departure time."
            })

        if (
                self.available_seats is not None
                and self.total_capacity is not None
                and self.available_seats > self.total_capacity
        ):
            raise ValidationError({
                "available_seats": (
                    "Available seats cannot exceed total capacity."
                )
            })

    @property
    def duration_minutes(self):
        if self.departure_at and self.arrival_at:
            return int(
                (self.arrival_at - self.departure_at).total_seconds() // 60
            )
        return None

    @property
    def is_sellable(self):
        now = timezone.now()

        return (
                self.status in (self.Status.ON_SALE, self.Status.SCHEDULED)
                and self.available_seats > 0
                and self.departure_at > now
        )

class FlightFare(models.Model):
    class CabinClass(models.TextChoices):
        ECONOMY = "economy", "economy"
        PREMIUM_ECONOMY = "premium_economy", "premium_economy"
        BUSINESS = "business", "business"
        FIRST = "first", "first"

    flight = models.ForeignKey(Flight, on_delete=models.CASCADE,related_name="fares", verbose_name="Flight")
    cabin_class = models.CharField(max_length=20 , default=CabinClass.ECONOMY, choices=CabinClass.choices , verbose_name="Cabin Class")
    price = models.DecimalField(max_digits=12,decimal_places=2,validators=[MinValueValidator(Decimal("0.00"))], verbose_name="Price")
    available_seat = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)], verbose_name="Available Seats")
    baggage_allowance = models.CharField(max_length=100,blank=True,default="20kg",verbose_name="Baggage Allowance")
    refundable = models.BooleanField(default=False,verbose_name="Refundable")
    changeable = models.BooleanField(default=False,verbose_name="Changable")

    class Meta:
        ordering = [('flight' , 'cabin_class' , 'price')]
        verbose_name = "Flight"
        verbose_name_plural = "Flights"

    def __str__(self):
        return f"{self.flight} - {self.get_cabin_class_display()}"
