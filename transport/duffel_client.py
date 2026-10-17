"""Client for the Duffel Flights API (search, get offer, create order)."""
import requests
from django.conf import settings

OFFER_REQUESTS_URL = "https://api.duffel.com/air/offer_requests"
OFFERS_URL = "https://api.duffel.com/air/offers"
ORDERS_URL = "https://api.duffel.com/air/orders"


class DuffelError(Exception):
    """Raised when Duffel cannot be reached or answers with an error."""

    def __init__(self, message, status_code=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _headers():
    token = settings.DUFFEL_ACCESS_TOKEN
    if not token:
        raise DuffelError("DUFFEL_ACCESS_TOKEN is empty. Check your .env file.")
    return {
        "Authorization": f"Bearer {token}",
        "Duffel-Version": "v2",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def _build_passengers(adults, children, infants):
    passengers = [{"type": "adult"} for _ in range(adults)]
    passengers += [{"type": "child"} for _ in range(children)]
    passengers += [{"type": "infant_without_seat"} for _ in range(infants)]
    return passengers


def search_offers(
    origin,
    destination,
    travel_date,
    return_date=None,
    adults=1,
    children=0,
    infants=0,
    cabin_class="economy",
):
    """
    Create an offer request on Duffel and return its `data` dictionary
    (offers under key "offers"). Round-trip if return_date is set.
    """
    slices = [
        {
            "origin": origin,
            "destination": destination,
            "departure_date": travel_date,
        }
    ]
    if return_date:
        slices.append(
            {
                "origin": destination,
                "destination": origin,
                "departure_date": return_date,
            }
        )

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
            OFFER_REQUESTS_URL,
            headers=_headers(),
            params=query,
            json=body,
            timeout=25,
        )
    except requests.Timeout:
        raise DuffelError("Duffel took too long to answer. Please try again.")
    except requests.RequestException:
        raise DuffelError(
            "Could not connect to Duffel. Check your internet connection."
        )

    try:
        payload = response.json()
    except ValueError:
        raise DuffelError(
            f"Duffel returned an unreadable answer (HTTP {response.status_code}).",
            response.status_code,
        )

    if response.status_code >= 400:
        errors = payload.get("errors") or [{}]
        message = (
            errors[0].get("message")
            or f"Duffel error (HTTP {response.status_code})."
        )
        raise DuffelError(message, response.status_code)

    return payload["data"]


def get_offer(offer_id: str, return_available_services: bool = False) -> dict:
    """
    Latest version of a single offer (revalidation).
    GET https://api.duffel.com/air/offers/{id}
    """
    if not offer_id:
        raise DuffelError("offer_id is required.")

    if offer_id.startswith("duffel-"):
        offer_id = offer_id[len("duffel-") :]

    params = {}
    if return_available_services:
        params["return_available_services"] = "true"

    try:
        response = requests.get(
            f"{OFFERS_URL}/{offer_id}",
            headers=_headers(),
            params=params,
            timeout=20,
        )
    except requests.Timeout:
        raise DuffelError("Duffel took too long to answer. Please try again.")
    except requests.RequestException:
        raise DuffelError("Could not connect to Duffel.")

    try:
        payload = response.json()
    except ValueError:
        raise DuffelError(
            f"Duffel returned an unreadable answer (HTTP {response.status_code}).",
            response.status_code,
        )

    if response.status_code >= 400:
        errors = payload.get("errors") or [{}]
        message = (
            errors[0].get("message")
            or f"Duffel error (HTTP {response.status_code})."
        )
        raise DuffelError(message, response.status_code)

    return payload["data"]


def create_order(
    *,
    offer_id: str,
    passengers: list,
    payments: list | None = None,
    metadata: dict | None = None,
) -> dict:
    """
    Create a Duffel order.
    POST https://api.duffel.com/air/orders
    """
    if not offer_id:
        raise DuffelError("offer_id is required.")
    if offer_id.startswith("duffel-"):
        offer_id = offer_id[len("duffel-") :]

    if not passengers:
        raise DuffelError("At least one passenger is required.")

    data = {
        "selected_offers": [offer_id],
        "passengers": passengers,
    }
    if payments:
        data["payments"] = payments
    if metadata:
        data["metadata"] = metadata

    try:
        response = requests.post(
            ORDERS_URL,
            headers=_headers(),
            json={"data": data},
            timeout=40,
        )
    except requests.Timeout:
        raise DuffelError("Duffel took too long to create the order.")
    except requests.RequestException:
        raise DuffelError("Could not connect to Duffel while creating the order.")

    try:
        payload = response.json()
    except ValueError:
        raise DuffelError(
            f"Duffel returned an unreadable answer (HTTP {response.status_code}).",
            response.status_code,
        )

    if response.status_code >= 400:
        errors = payload.get("errors") or [{}]
        message = (
            errors[0].get("message")
            or f"Duffel error (HTTP {response.status_code})."
        )
        raise DuffelError(message, response.status_code)

    return payload["data"]