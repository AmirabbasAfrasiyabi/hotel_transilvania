"""Tiny client for the Duffel Flights API (search only)."""
import requests
from django.conf import settings

OFFER_REQUESTS_URL = "https://api.duffel.com/air/offer_requests"


class DuffelError(Exception):
    """Raised when Duffel cannot be reached or answers with an error."""

    def __init__(self, message, status_code=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _build_passengers(adults, children, infants):
    passengers = [{"type": "adult"} for _ in range(adults)]
    passengers += [{"type": "child"} for _ in range(children)]
    passengers += [{"type": "infant_without_seat"} for _ in range(infants)]
    return passengers


def search_offers(origin, destination, travel_date, return_date=None,
                  adults=1, children=0, infants=0, cabin_class="economy"):
    """
    Create an offer request on Duffel and return its `data` dictionary
    (it contains the list of offers under the key "offers").
    If `return_date` is given, a second slice is added (round trip).
    """
    token = settings.DUFFEL_ACCESS_TOKEN
    if not token:
        raise DuffelError("DUFFEL_ACCESS_TOKEN is empty. Check your .env file.")

    headers = {
        "Authorization": f"Bearer {token}",
        "Duffel-Version": "v2",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    slices = [{
        "origin": origin,
        "destination": destination,
        "departure_date": travel_date,
    }]
    if return_date:
        # Round trip: the second slice flies the same route backwards.
        slices.append({
            "origin": destination,
            "destination": origin,
            "departure_date": return_date,
        })

    body = {
        "data": {
            "slices": slices,
            "passengers": _build_passengers(adults, children, infants),
            "cabin_class": cabin_class,
        }
    }
    query = {"return_offers": "true", "supplier_timeout": 15000}

    try:
        response = requests.post(
            OFFER_REQUESTS_URL, headers=headers, params=query,
            json=body, timeout=25,
        )
    except requests.Timeout:
        raise DuffelError("Duffel took too long to answer. Please try again.")
    except requests.RequestException:
        raise DuffelError("Could not connect to Duffel. Check your internet connection.")

    try:
        payload = response.json()
    except ValueError:
        raise DuffelError(
            f"Duffel returned an unreadable answer (HTTP {response.status_code}).",
            response.status_code,
        )

    if response.status_code >= 400:
        errors = payload.get("errors") or [{}]
        message = errors[0].get("message") or f"Duffel error (HTTP {response.status_code})."
        raise DuffelError(message, response.status_code)

    return payload["data"]