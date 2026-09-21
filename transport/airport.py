"""Map the city names used in our search form to airport IATA codes."""

# International cities offered in flight search.
# Key = city name in lowercase, exactly as the form shows it.
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
}

# Cities inside Iran. Kept for the future, but flight search does NOT use them:
# they are not suggested and not accepted (see city_to_iata below).
IRAN_AIRPORT_CODES = {
    "tehran": "THR",        # Mehrabad. (Imam Khomeini airport is IKA)
    "mashhad": "MHD",
    "isfahan": "IFN",
    "shiraz": "SYZ",
    "tabriz": "TBZ",
    "ahvaz": "AWZ",
    "kish island": "KIH",
    "qeshm": "GSM",
    "bandar abbas": "BND",
    "kerman": "KER",
    "rasht": "RAS",
    "yazd": "AZD",
    "kermanshah": "KSH",
    "urmia": "OMH",
    "zahedan": "ZAH",
    "qom": None,            # no regular commercial airport (please verify)
    "sari": "SRY",
}

# Raw airport codes we also refuse (so typing "THR" in a URL does not work either).
_BLOCKED_CODES = {code for code in IRAN_AIRPORT_CODES.values() if code} | {"IKA"}


def city_to_iata(name):
    """
    Return the IATA code for an international city name (case-insensitive).
    A raw 3-letter code such as "LHR" is also accepted (handy for testing),
    except the airports inside Iran.
    Returns None if we do not offer this city.
    """
    key = (name or "").strip().lower()
    if key in AIRPORT_CODES:
        return AIRPORT_CODES[key]
    if len(key) == 3 and key.isalpha():
        code = key.upper()
        return None if code in _BLOCKED_CODES else code
    return None