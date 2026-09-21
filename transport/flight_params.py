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


def _parse_date(raw):
    """'2026-10-25' -> date object, or None if the text is not a valid date."""
    try:
        return datetime.strptime(raw, "%Y-%m-%d").date()
    except ValueError:
        return None


def parse_search_params(query):
    """
    query: request.GET (or any dict-like object).
    Returns (params, errors).
    If `errors` is not empty, `params` must NOT be used.
    """
    errors = {}
    today = timezone.localdate()

    # --- origin / destination -------------------------------------------
    origin = (query.get("origin") or "").strip()
    destination = (query.get("destination") or "").strip()
    if not origin:
        errors["origin"] = "origin is required."
    if not destination:
        errors["destination"] = "destination is required."
    if origin and destination and origin.lower() == destination.lower():
        errors["destination"] = "destination must be different from origin."

    # --- trip type -------------------------------------------------------
    trip_type = (query.get("trip_type") or "oneway").strip()
    if trip_type not in ("oneway", "roundtrip"):
        errors["trip_type"] = "trip_type must be 'oneway' or 'roundtrip'."

    # --- departure date --------------------------------------------------
    departure = None
    raw_date = (query.get("travel_date") or "").strip()
    if not raw_date:
        errors["travel_date"] = "travel_date is required (format YYYY-MM-DD)."
    else:
        departure = _parse_date(raw_date)
        if departure is None:
            errors["travel_date"] = "travel_date must look like 2026-10-25."
        elif departure < today:
            errors["travel_date"] = "travel_date cannot be in the past."
            departure = None

    # --- return date (round trip only) ----------------------------------
    return_date = ""
    if trip_type == "roundtrip":
        raw_return = (query.get("return_date") or "").strip()
        if not raw_return:
            errors["return_date"] = "return_date is required for a round trip (format YYYY-MM-DD)."
        else:
            returning = _parse_date(raw_return)
            if returning is None:
                errors["return_date"] = "return_date must look like 2026-10-27."
            elif returning < today:
                errors["return_date"] = "return_date cannot be in the past."
            elif departure and returning <= departure:
                errors["return_date"] = "return_date must be after travel_date."
            else:
                return_date = returning.isoformat()

    # --- passengers ------------------------------------------------------
    adults = _get_int(query, "adults", 1, errors, 1, 9)
    children = _get_int(query, "children", 0, errors, 0, 8)
    infants = _get_int(query, "infants", 0, errors, 0, 9)
    if "infants" not in errors and infants > adults:
        errors["infants"] = "Each infant must travel with an adult."

    params = {
        "origin": origin,
        "destination": destination,
        "travel_date": departure.isoformat() if departure else "",
        "return_date": return_date,
        "trip_type": trip_type,
        "adults": adults,
        "children": children,
        "infants": infants,
    }
    return params, errors