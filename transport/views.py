from django.shortcuts import render
from help_center.models import FAQCategory
from help_center.services import get_service_content

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