from django.http import HttpResponse
from django.shortcuts import render
from .models import *
# Create your views here.

def index_view(request):
    # فقط مقصدهای فعال، طبق ترتیب تعریف‌شده در ادمین (display_order سپس name)
    destinations = Destination.objects.filter(is_active=True)
    return render(request, 'website/index.html', {
        'popular_destinations': destinations,
    })

def about_view(request):
    return render(request,'website/about.html')

def contact_view(request):
    return render(request,'website/contact.html')

def Why_view(request):
    return render(request,'website/why_Mine.html')
