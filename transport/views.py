from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_GET

from help_center.models import FAQCategory
from help_center.services import get_service_content
from transport.flight_params import parse_search_params

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
    return JsonResponse({"ok": True, "params": params})