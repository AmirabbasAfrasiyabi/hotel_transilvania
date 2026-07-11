from django.http import HttpResponse
from django.shortcuts import render

# Create your views here.

def blog_view(request):
    return HttpResponse("Hello, world. You're the blog!")

def blog_single(request):
    return HttpResponse("Hello, world. You're  in the single  blog pages !")