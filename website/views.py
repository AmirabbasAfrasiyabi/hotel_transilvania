from django.http import HttpResponse
from django.shortcuts import render

# Create your views here.

def index_view(request):
    return HttpResponse("Hello World")

def about_view(request):
    return HttpResponse("this is a about page")

def contact_view(request):
    return HttpResponse("this is a contact page")