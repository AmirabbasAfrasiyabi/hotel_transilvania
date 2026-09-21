AIRPORT_CODES = {
     # --- Iran ---
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

    # --- International ---
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

def city_to_iata(name):
    key = (name or "").strip().lower()
    if key in AIRPORT_CODES:
        return AIRPORT_CODES[key]
    if len(key) == 3 and key.isalpha():
        return key.upper()
    return None