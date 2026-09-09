from django.http import HttpResponse
from django.shortcuts import render,redirect
from .models import *
from website.forms import *
from django.contrib import messages
from help_center.models import FAQ, FAQCategory
from help_center.services import get_service_content
# Create your views here.

def index_view(request):
    # FAQ و Popular Destinations مربوط به «پرواز داخلی» از سرویس مشترک help_center می‌آید.
    context = get_service_content(FAQCategory.DOMESTIC_FLIGHT)

    return render(request, 'website/index.html', context)


def about_view(request):
    return render(request,'website/about.html')

def contact_view(request):
    if request.method == 'POST':
        form = ContactForm(request.POST)
        if form.is_valid():
            contact = form.save(commit=False)
            contact.name = "none"
            contact.save()
            messages.success(request, 'Your ticket submitted successfully')
            return redirect('website:contact')
    else:
        form = ContactForm()

    return render(request, 'website/contact.html', {'form': form})

def Why_view(request):
    return render(request,'website/why_Mine.html')
