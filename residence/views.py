from django.shortcuts import render
from pip._internal import req


# Create your views here.

def hotel_view(request):
    return render(request,'residence/hotels.html')

def village_view(request):
    return render(request,'residence/village.html')