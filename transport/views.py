# transport/views.py

from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_GET
from django.db.models import Prefetch

from help_center.models import FAQCategory
from help_center.services import get_service_content
from transport.flight_params import parse_search_params
from transport.airport import city_to_iata
from transport.duffel_client import DuffelError, search_offers
from transport.flight_mapper import simplify_offers
from transport.models import Flight, FlightFare

MAX_RESULTS = 30


# -------------------------------------------------
# Frontend Pages
# -------------------------------------------------

def Flight_view(request):
    context = get_service_content(FAQCategory.FLIGHT)
    return render(request, "transport/Flight.html", context)


def Train_view(request):
    context = get_service_content(FAQCategory.TRAIN)
    return render(request, "transport/Train.html", context)


def Bus_view(request):
    context = get_service_content(FAQCategory.BUS)
    return render(request, "transport/Bus.html", context)


def flight_results_view(request):
    """Results page. Shows loading state, then browser calls the JSON API."""
    params, errors = parse_search_params(request.GET)
    context = {
        "params": params,
        "errors": errors,
        "travellers": (
            params.get("adults", 1)
            + params.get("children", 0)
            + params.get("infants", 0)
        ),
    }
    return render(request, "transport/flight_results.html", context)


# -------------------------------------------------
# 1. Existing Duffel API (kept intact)
# -------------------------------------------------

@require_GET
def flight_search_api(request):
    params, errors = parse_search_params(request.GET)
    if errors:
        return JsonResponse({"ok": False, "errors": errors}, status=400)

    origin_code = city_to_iata(params["origin"])
    destination_code = city_to_iata(params["destination"])

    if not origin_code:
        errors["origin"] = f"No airport code known for '{params['origin']}'."
    if not destination_code:
        errors["destination"] = f"No airport code known for '{params['destination']}'."
    if origin_code and origin_code == destination_code:
        errors["destination"] = "destination must be different from origin."

    if errors:
        return JsonResponse({"ok": False, "errors": errors}, status=400)

    try:
        offer_request = search_offers(
            origin=origin_code,
            destination=destination_code,
            travel_date=params["travel_date"],
            return_date=params["return_date"] or None,
            adults=params["adults"],
            children=params["children"],
            infants=params["infants"],
        )
    except DuffelError as exc:
        return JsonResponse(
            {"ok": False, "errors": {"provider": exc.message}}, status=502
        )

    offers = offer_request.get("offers", [])
    return JsonResponse({
        "ok": True,
        "source": "duffel",
        "params": params,
        "airports": {
            "origin": origin_code,
            "destination": destination_code,
        },
        "offer_request_id": offer_request.get("id"),
        "live_mode": offer_request.get("live_mode"),
        "total_offers": len(offers),
        "flights": simplify_offers(offers, limit=MAX_RESULTS),
    })


# -------------------------------------------------
# 2. Internal Search API
# -------------------------------------------------

@require_GET
def internal_flight_search_api(request):
    """Search only in our internal database."""
    params, errors = parse_search_params(request.GET)
    if errors:
        return JsonResponse({"ok": False, "errors": errors}, status=400)

    origin_code = city_to_iata(params["origin"])
    destination_code = city_to_iata(params["destination"])

    if not origin_code:
        errors["origin"] = f"No airport code known for '{params['origin']}'."
    if not destination_code:
        errors["destination"] = f"No airport code known for '{params['destination']}'."
    if origin_code and origin_code == destination_code:
        errors["destination"] = "destination must be different from origin."

    if errors:
        return JsonResponse({"ok": False, "errors": errors}, status=400)

    qs = (
        Flight.objects.select_related("airline", "origin", "destination")
        .prefetch_related(
            Prefetch("fares", queryset=FlightFare.objects.filter(available_seats__gt=0))
        )
        .filter(
            origin__iata_code=origin_code,
            destination__iata_code=destination_code,
            departure_at__date=params["travel_date"],
            is_active=True,
            status__in=[Flight.Status.ON_SALE, Flight.Status.SCHEDULED],
            available_seats__gt=0,
        )
    )

    total_passengers = params.get("adults", 1) + params.get("children", 0)
    qs = qs.filter(available_seats__gte=total_passengers)

    # Optional filters
    min_price = request.GET.get("min_price")
    max_price = request.GET.get("max_price")
    airline_code = request.GET.get("airline")

    if min_price:
        try:
            qs = qs.filter(base_price__gte=float(min_price))
        except (ValueError, TypeError):
            pass

    if max_price:
        try:
            qs = qs.filter(base_price__lte=float(max_price))
        except (ValueError, TypeError):
            pass

    if airline_code:
        qs = qs.filter(airline__iata_code=airline_code.upper())

    sort = request.GET.get("sort", "price")
    if sort == "departure":
        qs = qs.order_by("departure_at")
    else:
        qs = qs.order_by("base_price", "departure_at")

    results = []
    for flight in qs[:50]:
        results.append({
            "id": flight.id,
            "source": "internal",
            "airline": {
                "name": flight.airline.name,
                "iata_code": flight.airline.iata_code,
                "logo": flight.airline.logo.url if flight.airline.logo else None,
            },
            "flight_number": flight.flight_number,
            "origin": {
                "iata_code": flight.origin.iata_code,
                "city": flight.origin.city,
                "name": flight.origin.name,
            },
            "destination": {
                "iata_code": flight.destination.iata_code,
                "city": flight.destination.city,
                "name": flight.destination.name,
            },
            "departure_at": flight.departure_at.isoformat(),
            "arrival_at": flight.arrival_at.isoformat(),
            "duration_minutes": flight.duration_minutes,
            "base_price": str(flight.base_price),
            "currency": flight.currency,
            "available_seats": flight.available_seats,
            "status": flight.status,
            "is_sellable": flight.is_sellable,
            "baggage_allowance": flight.baggage_allowance,
            "fares": [
                {
                    "cabin_class": fare.cabin_class,
                    "price": str(fare.price),
                    "available_seats": fare.available_seats,
                    "refundable": fare.refundable,
                    "changeable": fare.changeable,
                }
                for fare in flight.fares.all()
            ],
        })

    return JsonResponse({
        "ok": True,
        "source": "internal",
        "params": {
            "origin": origin_code,
            "destination": destination_code,
            "travel_date": params["travel_date"],
            "adults": params.get("adults", 1),
            "children": params.get("children", 0),
            "infants": params.get("infants", 0),
        },
        "count": len(results),
        "results": results,
    })


# -------------------------------------------------
# 3. Hybrid Search API (Recommended)
# -------------------------------------------------

@require_GET
def hybrid_flight_search_api(request):
    """
    Combines internal database flights + Duffel offers.
    Internal flights appear first.
    """
    params, errors = parse_search_params(request.GET)
    if errors:
        return JsonResponse({"ok": False, "errors": errors}, status=400)

    origin_code = city_to_iata(params["origin"])
    destination_code = city_to_iata(params["destination"])

    if not origin_code:
        errors["origin"] = f"No airport code known for '{params['origin']}'."
    if not destination_code:
        errors["destination"] = f"No airport code known for '{params['destination']}'."
    if origin_code and origin_code == destination_code:
        errors["destination"] = "destination must be different from origin."

    if errors:
        return JsonResponse({"ok": False, "errors": errors}, status=400)

    # ---------- Internal Flights ----------
    internal_flights = []
    try:
        qs = (
            Flight.objects.select_related("airline", "origin", "destination")
            .prefetch_related("fares")
            .filter(
                origin__iata_code=origin_code,
                destination__iata_code=destination_code,
                departure_at__date=params["travel_date"],
                is_active=True,
                status__in=[Flight.Status.ON_SALE, Flight.Status.SCHEDULED],
                available_seats__gt=0,
            )
            .order_by("base_price")
        )

        total_passengers = params.get("adults", 1) + params.get("children", 0)
        qs = qs.filter(available_seats__gte=total_passengers)[:15]

        for flight in qs:
            internal_flights.append({
                "id": f"internal-{flight.id}",
                "source": "internal",
                "airline": {
                    "name": flight.airline.name,
                    "iata_code": flight.airline.iata_code,
                    "logo_url": flight.airline.logo.url if flight.airline.logo else None,
                },
                "flight_number": flight.flight_number,
                "origin": {
                    "iata_code": flight.origin.iata_code,
                    "city_name": flight.origin.city,
                },
                "destination": {
                    "iata_code": flight.destination.iata_code,
                    "city_name": flight.destination.city,
                },
                "departure_at": flight.departure_at.isoformat(),
                "arrival_at": flight.arrival_at.isoformat(),
                "duration_minutes": flight.duration_minutes,
                "price": {
                    "amount": str(flight.base_price),
                    "currency": flight.currency,
                },
                "available_seats": flight.available_seats,
                "baggage_allowance": flight.baggage_allowance,
                "is_sellable": flight.is_sellable,
                "slices": [
                    {
                        "origin": {
                            "iata_code": flight.origin.iata_code,
                            "city_name": flight.origin.city,
                        },
                        "destination": {
                            "iata_code": flight.destination.iata_code,
                            "city_name": flight.destination.city,
                        },
                        "departure_at": flight.departure_at.isoformat(),
                        "arrival_at": flight.arrival_at.isoformat(),
                        "duration_minutes": flight.duration_minutes,
                        "stops": 0,
                    }
                ],
            })
    except Exception:
        # Continue even if internal search fails
        pass

    # ---------- Duffel Flights ----------
    duffel_flights = []
    duffel_meta = {}
    try:
        offer_request = search_offers(
            origin=origin_code,
            destination=destination_code,
            travel_date=params["travel_date"],
            return_date=params["return_date"] or None,
            adults=params["adults"],
            children=params["children"],
            infants=params["infants"],
        )
        offers = offer_request.get("offers", [])
        duffel_flights = simplify_offers(offers, limit=MAX_RESULTS)

        for f in duffel_flights:
            f["source"] = "duffel"
            if "id" in f:
                f["id"] = f"duffel-{f['id']}"

        duffel_meta = {
            "offer_request_id": offer_request.get("id"),
            "live_mode": offer_request.get("live_mode"),
            "total_offers": len(offers),
        }
    except DuffelError as exc:
        duffel_meta = {"error": str(exc.message)}

    # ---------- Combine (Internal first) ----------
    combined = internal_flights + duffel_flights

    return JsonResponse({
        "ok": True,
        "source": "hybrid",
        "params": params,
        "airports": {
            "origin": origin_code,
            "destination": destination_code,
        },
        "internal_count": len(internal_flights),
        "duffel_count": len(duffel_flights),
        "total_offers": len(combined),
        "duffel_meta": duffel_meta,
        "flights": combined,
    })