# transport/services.py

from datetime import datetime
from decimal import Decimal, InvalidOperation

from django.db.models import Prefetch, Q
from django.utils import timezone

from .models import Flight, FlightFare


def parse_search_params(query_dict):
    """
    Validate and parse search parameters from request.GET.
    Returns (params, errors).
    If errors is not empty, params should not be used.
    """
    errors = {}
    params = {}

    # Origin & Destination
    origin = (query_dict.get("origin") or "").strip().upper()
    destination = (query_dict.get("destination") or "").strip().upper()

    if not origin or len(origin) != 3:
        errors["origin"] = "A valid 3-letter origin code is required."
    if not destination or len(destination) != 3:
        errors["destination"] = "A valid 3-letter destination code is required."
    if origin and destination and origin == destination:
        errors["destination"] = "Origin and destination cannot be the same."

    params["origin"] = origin
    params["destination"] = destination

    # Departure date
    raw_date = (query_dict.get("departure_date") or query_dict.get("travel_date") or "").strip()
    if not raw_date:
        errors["departure_date"] = "Departure date is required (YYYY-MM-DD)."
    else:
        try:
            dep_date = datetime.strptime(raw_date, "%Y-%m-%d").date()
            if dep_date < timezone.localdate():
                errors["departure_date"] = "Departure date cannot be in the past."
            else:
                params["departure_date"] = dep_date
        except ValueError:
            errors["departure_date"] = "Departure date must be in YYYY-MM-DD format."

    # Return date (optional)
    raw_return = (query_dict.get("return_date") or "").strip()
    if raw_return:
        try:
            return_date = datetime.strptime(raw_return, "%Y-%m-%d").date()
            if "departure_date" in params and return_date <= params["departure_date"]:
                errors["return_date"] = "Return date must be after departure date."
            else:
                params["return_date"] = return_date
        except ValueError:
            errors["return_date"] = "Return date must be in YYYY-MM-DD format."

    # Passengers
    def get_int(name, default, minimum, maximum):
        try:
            value = int(query_dict.get(name, default))
            if not (minimum <= value <= maximum):
                errors[name] = f"{name} must be between {minimum} and {maximum}."
                return default
            return value
        except (ValueError, TypeError):
            errors[name] = f"{name} must be a whole number."
            return default

    params["adults"] = get_int("adults", 1, 1, 9)
    params["children"] = get_int("children", 0, 0, 8)
    params["infants"] = get_int("infants", 0, 0, 9)

    if params["infants"] > params["adults"]:
        errors["infants"] = "Each infant must travel with an adult."

    # Optional filters
    params["cabin_class"] = (query_dict.get("cabin_class") or "").strip().lower() or None
    params["airline"] = (query_dict.get("airline") or "").strip().upper() or None
    params["sort"] = (query_dict.get("sort") or "price").strip().lower()

    # Price range
    for key in ("min_price", "max_price"):
        raw = query_dict.get(key)
        if raw:
            try:
                params[key] = Decimal(str(raw))
            except (InvalidOperation, ValueError):
                errors[key] = f"{key} must be a valid number."

    # Pagination
    try:
        params["page"] = max(1, int(query_dict.get("page", 1)))
    except (ValueError, TypeError):
        params["page"] = 1

    try:
        params["page_size"] = min(50, max(1, int(query_dict.get("page_size", 20))))
    except (ValueError, TypeError):
        params["page_size"] = 20

    return params, errors


def search_flights(params):
    """
    Build and return a filtered QuerySet of Flight objects
    based on the validated search parameters.
    """
    qs = (
        Flight.objects.select_related("airline", "origin", "destination")
        .prefetch_related(
            Prefetch(
                "fares",
                queryset=FlightFare.objects.filter(available_seats__gt=0),
            )
        )
        .filter(
            origin__iata_code=params["origin"],
            destination__iata_code=params["destination"],
            departure_at__date=params["departure_date"],
            is_active=True,
            status__in=[Flight.Status.ON_SALE, Flight.Status.SCHEDULED],
            available_seats__gt=0,
        )
    )

    # Passenger capacity
    total_passengers = params.get("adults", 1) + params.get("children", 0)
    qs = qs.filter(available_seats__gte=total_passengers)

    # Price filters
    if min_price := params.get("min_price"):
        qs = qs.filter(base_price__gte=min_price)
    if max_price := params.get("max_price"):
        qs = qs.filter(base_price__lte=max_price)

    # Airline filter
    if airline := params.get("airline"):
        qs = qs.filter(airline__iata_code=airline)

    # Cabin class filter
    if cabin_class := params.get("cabin_class"):
        qs = qs.filter(fares__cabin_class=cabin_class)

    # Sorting
    sort = params.get("sort", "price")
    if sort == "departure":
        qs = qs.order_by("departure_at")
    elif sort == "duration":
        qs = qs.order_by("departure_at", "arrival_at")
    else:
        qs = qs.order_by("base_price", "departure_at")

    return qs.distinct()