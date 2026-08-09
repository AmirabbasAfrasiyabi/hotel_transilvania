from django.shortcuts import render

# Create your views here.

def international_flight(request):
    return render(request,'flight/Intenatinal_Flight.html')

def domestic_flight(request):
    return render(request,'flight/Domestic_Flight.html')