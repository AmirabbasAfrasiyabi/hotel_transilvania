from django.shortcuts import render

# Create your views here.

def Flight_view(request):
    return render(request,'transport/Flight.html')

def Train_view(request):
    return render(request,'transport/Train.html')

def Bus_view(request):
    return render(request,'transport/Bus.html')