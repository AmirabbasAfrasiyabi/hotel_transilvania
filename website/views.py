from django.http import HttpResponse
from django.shortcuts import render,redirect
from .models import *
from website.forms import *
from django.contrib import messages
from help_center.models import FAQ, FAQCategory
# Create your views here.

def index_view(request):
    # فقط مقصدهای فعال، طبق ترتیب تعریف‌شده در ادمین (display_order سپس name)
    destinations = Destination.objects.filter(is_active=True)

    domestic_faqs = FAQ.objects.for_category(FAQCategory.DOMESTIC_FLIGHT)

    return render(request, 'website/index.html', {
        'popular_destinations': destinations,
        'domestic_faqs': domestic_faqs,
    })

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
