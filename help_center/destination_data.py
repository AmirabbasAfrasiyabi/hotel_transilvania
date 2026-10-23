"""
لیست شهرهای معروف بین‌المللی و نگاشت شهر → کشور
"""

# (city_value, city_label, country_value)
CITY_COUNTRY_DATA = [
    # Turkey
    ("Istanbul", "Istanbul", "Turkey"),
    ("Antalya", "Antalya", "Turkey"),
    ("Ankara", "Ankara", "Turkey"),
    ("Izmir", "Izmir", "Turkey"),
    ("Trabzon", "Trabzon", "Turkey"),
    ("Bodrum", "Bodrum", "Turkey"),
    # UAE
    ("Dubai", "Dubai", "United Arab Emirates"),
    ("Abu Dhabi", "Abu Dhabi", "United Arab Emirates"),
    ("Sharjah", "Sharjah", "United Arab Emirates"),
    # Qatar / Gulf
    ("Doha", "Doha", "Qatar"),
    ("Riyadh", "Riyadh", "Saudi Arabia"),
    ("Jeddah", "Jeddah", "Saudi Arabia"),
    ("Muscat", "Muscat", "Oman"),
    ("Kuwait City", "Kuwait City", "Kuwait"),
    ("Manama", "Manama", "Bahrain"),
    ("Baghdad", "Baghdad", "Iraq"),
    # Caucasus
    ("Tbilisi", "Tbilisi", "Georgia"),
    ("Batumi", "Batumi", "Georgia"),
    ("Yerevan", "Yerevan", "Armenia"),
    ("Baku", "Baku", "Azerbaijan"),
    # Europe
    ("Paris", "Paris", "France"),
    ("Nice", "Nice", "France"),
    ("London", "London", "United Kingdom"),
    ("Manchester", "Manchester", "United Kingdom"),
    ("Rome", "Rome", "Italy"),
    ("Milan", "Milan", "Italy"),
    ("Venice", "Venice", "Italy"),
    ("Barcelona", "Barcelona", "Spain"),
    ("Madrid", "Madrid", "Spain"),
    ("Berlin", "Berlin", "Germany"),
    ("Munich", "Munich", "Germany"),
    ("Frankfurt", "Frankfurt", "Germany"),
    ("Hamburg", "Hamburg", "Germany"),
    ("Amsterdam", "Amsterdam", "Netherlands"),
    ("Vienna", "Vienna", "Austria"),
    ("Zurich", "Zurich", "Switzerland"),
    ("Geneva", "Geneva", "Switzerland"),
    ("Athens", "Athens", "Greece"),
    ("Thessaloniki", "Thessaloniki", "Greece"),
    ("Prague", "Prague", "Czech Republic"),
    ("Budapest", "Budapest", "Hungary"),
    ("Warsaw", "Warsaw", "Poland"),
    ("Lisbon", "Lisbon", "Portugal"),
    ("Stockholm", "Stockholm", "Sweden"),
    ("Copenhagen", "Copenhagen", "Denmark"),
    ("Brussels", "Brussels", "Belgium"),
    ("Dublin", "Dublin", "Ireland"),
    ("Larnaca", "Larnaca", "Cyprus"),
    # Russia
    ("Moscow", "Moscow", "Russia"),
    ("Saint Petersburg", "Saint Petersburg", "Russia"),
    # Asia
    ("Beijing", "Beijing", "China"),
    ("Shanghai", "Shanghai", "China"),
    ("Tokyo", "Tokyo", "Japan"),
    ("Osaka", "Osaka", "Japan"),
    ("Bangkok", "Bangkok", "Thailand"),
    ("Phuket", "Phuket", "Thailand"),
    ("Kuala Lumpur", "Kuala Lumpur", "Malaysia"),
    ("Bali", "Bali", "Indonesia"),
    ("Singapore", "Singapore", "Singapore"),
    ("Delhi", "Delhi", "India"),
    ("Mumbai", "Mumbai", "India"),
    # Americas / Oceania
    ("New York", "New York", "United States"),
    ("Los Angeles", "Los Angeles", "United States"),
    ("Toronto", "Toronto", "Canada"),
    ("Sydney", "Sydney", "Australia"),
    ("Melbourne", "Melbourne", "Australia"),
]

CITY_CHOICES = [(c[0], c[1]) for c in CITY_COUNTRY_DATA]

COUNTRY_CHOICES = sorted(
    {(c[2], c[2]) for c in CITY_COUNTRY_DATA},
    key=lambda x: x[0],
)

# نگاشت سریع: نام شهر → کشور
CITY_TO_COUNTRY = {c[0]: c[2] for c in CITY_COUNTRY_DATA}
