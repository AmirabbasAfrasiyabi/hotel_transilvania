"""Turn big Duffel offers into small, simple dictionaries for the frontend."""
import logging
import re
from decimal import Decimal, InvalidOperation

logger = logging.getLogger(__name__)

# Matches ISO 8601 durations such as "PT7H58M", "PT02H26M", "PT45M", "P1DT2H".
_DURATION_RE = re.compile(r"^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?$")


def parse_duration_minutes(iso_duration):
    """'PT7H58M' -> 478. Returns None if the text is not understood."""
    match = _DURATION_RE.match(iso_duration or "")
    if not match:
        return None
    days, hours, minutes = (int(part or 0) for part in match.groups())
    return days * 24 * 60 + hours * 60 + minutes


def format_duration(minutes):
    """478 -> '7h 58m'."""
    if minutes is None:
        return ""
    hours, mins = divmod(minutes, 60)
    return f"{hours}h {mins:02d}m"


def _dig(data, *path, default=None):
    """Safely read nested dictionary keys: _dig(o, 'owner', 'name')."""
    for key in path:
        if not isinstance(data, dict):
            return default
        data = data.get(key)
        if data is None:
            return default
    return data


def _place(airport, iso_datetime):
    """Build {'airport', 'city', 'date', 'time'} from an airport + local datetime."""
    iso_datetime = iso_datetime or ""
    return {
        "airport": _dig(airport, "iata_code"),
        "city": _dig(airport, "city_name"),
        "date": iso_datetime[:10],
        "time": iso_datetime[11:16],
    }


def _baggage(segment):
    """Sum baggage of the first passenger: {'checked': 1, 'carry_on': 1}."""
    result = {"checked": 0, "carry_on": 0}
    passengers = segment.get("passengers") or []
    if passengers:
        for bag in passengers[0].get("baggages") or []:
            if bag.get("type") in result:
                result[bag["type"]] += bag.get("quantity") or 0
    return result


def _flight_number(segment):
    code = _dig(segment, "marketing_carrier", "iata_code") or ""
    number = segment.get("marketing_carrier_flight_number") or ""
    return f"{code}{number}"


def simplify_offer(offer):
    """Convert ONE Duffel offer (one-way search) into a simple dictionary."""
    flight_slice = offer["slices"][0]
    segments = flight_slice["segments"]
    first, last = segments[0], segments[-1]

    minutes = parse_duration_minutes(flight_slice.get("duration"))
    first_passenger = (first.get("passengers") or [{}])[0]

    return {
        "id": offer["id"],
        "price": {
            "amount": offer.get("total_amount"),
            "currency": offer.get("total_currency"),
        },
        "airline": {
            "name": _dig(offer, "owner", "name"),
            "code": _dig(offer, "owner", "iata_code"),
            "logo": _dig(offer, "owner", "logo_symbol_url"),
        },
        "operating_airline": _dig(first, "operating_carrier", "name"),
        "departure": _place(first.get("origin"), first.get("departing_at")),
        "arrival": _place(last.get("destination"), last.get("arriving_at")),
        "duration_minutes": minutes,
        "duration_text": format_duration(minutes),
        "stops": len(segments) - 1,
        "flight_number": _flight_number(first),
        "aircraft": _dig(first, "aircraft", "name"),
        "cabin": first_passenger.get("cabin_class_marketing_name"),
        "baggage": _baggage(first),
        "segments": [
            {
                "from": _dig(seg, "origin", "iata_code"),
                "to": _dig(seg, "destination", "iata_code"),
                "departing_at": seg.get("departing_at"),
                "arriving_at": seg.get("arriving_at"),
                "flight_number": _flight_number(seg),
                "airline": _dig(seg, "operating_carrier", "name"),
            }
            for seg in segments
        ],
        "expires_at": offer.get("expires_at"),
    }


def _price_sort_key(flight):
    try:
        return Decimal(flight["price"]["amount"])
    except (InvalidOperation, TypeError):
        return Decimal("Infinity")  # broken prices go to the end


def simplify_offers(offers, limit=30):
    """Simplify all offers, sort by price (cheapest first), keep `limit`."""
    flights = []
    for offer in offers:
        try:
            flights.append(simplify_offer(offer))
        except (KeyError, IndexError, TypeError):
            logger.warning("Skipping a malformed offer: %s", offer.get("id"))
    flights.sort(key=_price_sort_key)
    return flights[:limit]