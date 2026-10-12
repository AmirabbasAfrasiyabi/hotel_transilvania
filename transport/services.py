# transport/services.py
from datetime import datetime, time
from decimal import Decimal, InvalidOperation

from django.db.models import Q, Prefetch
from django.utils import timezone

from .models import Flight, FlightFare, Airport, Airline


def parse_search_params(query_dict):
    errors = {}
    params = {}

    # Origin / destination
    origin = (query_dict.get("origin") or "").strip().upper()
    destination = (query_dict.get("destination") or "").strip().upper()

    if not origin or len(origin) != 3:
        errors["origin"] = "A valid 3-letter origin code is required."

    if not destination or len(destination) != 3:
        errors["destination"] = "A valid 3-letter destination code is required."

    if origin and destination and origin == destination:
        errors["destination"] = "Origin and destination cannot be the same."

    # Dates
    try:
        dep_date = datetime.strptime(
            query_dict.get("departure_date", ""),
            "%Y-%m-%d",
        ).date()

        if dep_date < timezone.localdate():
            errors["departure_date"] = "Departure date cannot be in the past."

        params["departure_date"] = dep_date

    except ValueError:
        errors["departure_date"] = (
            "Departure date must be in YYYY-MM-DD format."
        )

    # Passengers
    try:
        adults = int(query_dict.get("adults", 1))

        if not 1 <= adults <= 9:
            raise ValueError

        params["adults"] = adults

    except (ValueError, TypeError):
        errors["adults"] = "The number of adults must be between 1 and 9."

    # ... Similar validation for children, infants, cabin_class,
    # min_price, max_price, airline, sort, and page.

    params["origin"] = origin
    params["destination"] = destination

    # ... Complete the remaining parameters.

    return params, errors


def search_flights(params):
    qs = Flight.objects.select_related(
        "airline",
        "origin",
        "destination",
    ).prefetch_related(
        Prefetch(
            "fares",
            queryset=FlightFare.objects.filter(available_seats__gt=0),
        )
    ).filter(
        origin__iata_code=params["origin"],
        destination__iata_code=params["destination"],
        departure_at__date=params["departure_date"],
        is_active=True,
        status__in=[
            Flight.Status.ON_SALE,
            Flight.Status.SCHEDULED,
        ],
        available_seats__gte=(
            params.get("adults", 1) + params.get("children", 0)
        ),
    )

    # Additional filters (price, airline, cabin class, etc.)
    if min_price := params.get("min_price"):
        qs = qs.filter(base_price__gte=min_price)

    # ...

    # Sorting
    sort = params.get("sort", "price")

    if sort == "price":
        qs = qs.order_by("base_price")

    elif sort == "departure":
        qs = qs.order_by("departure_at")

    return qs