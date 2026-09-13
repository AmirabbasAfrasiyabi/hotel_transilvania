from django.shortcuts import render
from help_center.models import FAQCategory
from help_center.services import get_service_content


# Create your views here.

def hotel_view(request):
    context = get_service_content(FAQCategory.HOTEL, split_domestic=True)
    return render(request,'residence/hotels.html',context)

def village_view(request):
    context = get_service_content(FAQCategory.VILLA)
    return render(request,'residence/village.html',context)