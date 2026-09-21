from django.http import JsonResponse
from django.conf import settings
from django.shortcuts import render
from django.views.decorators.http import require_GET

from help_center.models import FAQCategory
from help_center.services import get_service_content
from transport.flight_params import parse_search_params
from transport.airport import city_to_iata
from transport.duffel_client import DuffelError, search_offers
from transport.flight_mapper import simplify_offers
MAX_RESULTS = 30
# Create your views here.

def Flight_view(request):
    context = get_service_content(FAQCategory.FLIGHT)
    return render(request, 'transport/Flight.html', context)

def Train_view(request):
    context = get_service_content(FAQCategory.TRAIN)
    return render(request, 'transport/Train.html', context)

def Bus_view(request):
    context = get_service_content(FAQCategory.BUS)
    return render(request, 'transport/Bus.html', context)

@require_GET
def flight_search_api(request):
    params, errors = parse_search_params(request.GET)
    if errors:
        return JsonResponse({"ok": False, "errors": errors}, status=400)
    origin_code = city_to_iata(params["origin"])
    destination_code = city_to_iata(params["destination"])
    if not origin_code :
        errors["origin"] = f"No airport code known for '{params['origin']}'."
    if not destination_code :
        errors["destination"] = f"No airport code known for '{params['destination']}'."
    if origin_code and origin_code == destination_code:
        errors["destination"] = "destination must be different from origin."
    if errors:
        return JsonResponse({"ok": True, "params": params})
    try:
        offer_request = search_offers(
            origin=origin_code,
            destination=destination_code,
            travel_date=params["travel_date"],
            adults=params["adults"],
            children=params["children"],
            infants=params["infants"],
        )
    except DuffelError as exc:
        return JsonResponse({"ok": False, "errors": {"provider": exc.message}}, status=502)

    offers = offer_request.get("offers", [])
    return JsonResponse({
        "ok": True,
        "params": params,
        "airports": {"origin": origin_code, "destination": destination_code},
        "offer_request_id": offer_request.get("id"),
        "live_mode": offer_request.get("live_mode"),
        "total_offers": len(offers),
        "flights": simplify_offers(offers, limit=MAX_RESULTS),
    })

def flight_results_view(request):
    """Results page. It shows a loading state; the browser then calls the JSON API."""
    params, errors = parse_search_params(request.GET)
    context = {
        "params": params,
        "errors": errors,
        "travellers": params["adults"] + params["children"] + params["infants"],
    }
    return render(request, "transport/flight_results.html", context)