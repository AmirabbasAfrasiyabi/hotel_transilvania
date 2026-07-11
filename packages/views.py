from django.http import HttpResponse
from django.shortcuts import render

def packages_view(request):
    return render(request,'packages/packages.html')

def hotel_view(request):
    return render(request,'packages/hotels.html')