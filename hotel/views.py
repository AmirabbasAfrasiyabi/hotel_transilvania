from django.http import HttpResponse
from django.shortcuts import render

def hotel_view(request):
    return render(request,'hotel/hotel.html')

