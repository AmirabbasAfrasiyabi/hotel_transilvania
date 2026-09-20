"""Read and validate the flight-search parameters sent by the browser."""
from datetime import datetime

from django.utils import timezone


def _get_int(query, name, default, errors, minimum, maximum):
    """Read an integer parameter; record an error if it is invalid."""
    raw = query.get(name, default)
    try:
        value = int(raw)
    except (TypeError, ValueError):
        errors[name] = f"{name} must be a whole number."
        return default
    if not (minimum <= value <= maximum):
        errors[name] = f"{name} must be between {minimum} and {maximum}."
    return value


def parse_search_params(query):
    """
    query: request.GET (or any dict-like object).
    Returns (params, errors).
    If `errors` is not empty, `params` must NOT be used.
    """
    errors = {}

    # --- origin / destination -------------------------------------------
    origin = (query.get("origin") or "").strip()
    destination = (query.get("destination") or "").strip()
    if not origin:
        errors["origin"] = "origin is required."
    if not destination:
        errors["destination"] = "destination is required."
    if origin and destination and origin.lower() == destination.lower():
        errors["destination"] = "destination must be different from origin."

    # --- trip type (only one-way for now) --------------------------------
    trip_type = (query.get("trip_type") or "oneway").strip()
    if trip_type != "oneway":
        errors["trip_type"] = "Only one-way search is supported for now."

    # --- departure date --------------------------------------------------
    travel_date = ""
    raw_date = (query.get("travel_date") or "").strip()
    if not raw_date:
        errors["travel_date"] = "travel_date is required (format YYYY-MM-DD)."
    else:
        try:
            parsed = datetime.strptime(raw_date, "%Y-%m-%d").date()
        except ValueError:
            errors["travel_date"] = "travel_date must look like 2026-10-25."
        else:
            if parsed < timezone.localdate():
                errors["travel_date"] = "travel_date cannot be in the past."
            else:
                travel_date = parsed.isoformat()

    # --- passengers ------------------------------------------------------
    adults = _get_int(query, "adults", 1, errors, 1, 9)
    children = _get_int(query, "children", 0, errors, 0, 8)
    infants = _get_int(query, "infants", 0, errors, 0, 9)
    if "infants" not in errors and infants > adults:
        errors["infants"] = "Each infant must travel with an adult."

    params = {
        "origin": origin,
        "destination": destination,
        "travel_date": travel_date,
        "trip_type": trip_type,
        "adults": adults,
        "children": children,
        "infants": infants,
    }
    return params, errors