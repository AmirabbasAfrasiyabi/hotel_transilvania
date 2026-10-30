"""Map city names (or free text) to airport IATA codes.

Resolution order:
  1. Local dictionary (fast, offline)
  2. Raw 3-letter IATA code (e.g. DOH, BER)
  3. Duffel Places Suggestions API (any city worldwide)
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

# Fast local map for common cities (optional cache; not a hard limit).
AIRPORT_CODES = {
    "dubai": "DXB",
    "istanbul": "IST",
    "antalya": "AYT",
    "paris": "CDG",
    "london": "LHR",
    "tokyo": "HND",
    "new york": "JFK",
    "rome": "FCO",
    "barcelona": "BCN",
    "bangkok": "BKK",
    "berlin": "BER",
    "amsterdam": "AMS",
    "vienna": "VIE",
    "cairo": "CAI",
    "kuala lumpur": "KUL",
    "doha": "DOH",
    "madrid": "MAD",
    "lisbon": "LIS",
    "milan": "MXP",
    "munich": "MUC",
    "frankfurt": "FRA",
    "zurich": "ZRH",
    "brussels": "BRU",
    "prague": "PRG",
    "athens": "ATH",
    "dublin": "DUB",
    "los angeles": "LAX",
    "san francisco": "SFO",
    "chicago": "ORD",
    "miami": "MIA",
    "toronto": "YYZ",
    "singapore": "SIN",
    "hong kong": "HKG",
    "seoul": "ICN",
    "beijing": "PEK",
    "shanghai": "PVG",
    "sydney": "SYD",
    "melbourne": "MEL",
    "abu dhabi": "AUH",
    "riyadh": "RUH",
    "jeddah": "JED",
    "delhi": "DEL",
    "mumbai": "BOM",
    "tehran": "IKA",
    "mashhad": "MHD",
    "isfahan": "IFN",
    "shiraz": "SYZ",
}

# In-memory cache for Duffel lookups in this process
_CACHE: dict[str, str | None] = {}


def _lookup_duffel_place(query: str) -> str | None:
    """
    Ask Duffel Places Suggestions for the best airport/city match.
    Returns an IATA code or None.
    """
    key = query.strip().lower()
    if key in _CACHE:
        return _CACHE[key]

    try:
        from transport.duffel_client import suggest_places

        places = suggest_places(query)
    except Exception as exc:  # network / config — do not crash the search
        logger.warning("Duffel places lookup failed for %r: %s", query, exc)
        _CACHE[key] = None
        return None

    code = None
    # Prefer airport, then city
    for place in places:
        ptype = (place.get("type") or "").lower()
        iata = place.get("iata_code") or place.get("iata_city_code")
        if not iata:
            continue
        if ptype == "airport":
            code = iata
            break
        if code is None:  # first city-level hit as fallback
            code = iata

    _CACHE[key] = code
    return code


def city_to_iata(name: str) -> str | None:
    """
    Return an IATA airport (or city) code for any free-text place name.
    No hard whitelist — unknown names are resolved via Duffel when possible.
    """
    key = (name or "").strip().lower()
    if not key:
        return None

    # 1) Local dictionary
    if key in AIRPORT_CODES:
        return AIRPORT_CODES[key]

    # 2) Already an IATA code
    if len(key) == 3 and key.isalpha():
        return key.upper()

    # 3) Live lookup via Duffel Places API
    return _lookup_duffel_place(key)
