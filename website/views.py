from django.shortcuts import render, redirect
from website.forms import ContactForm
from django.contrib import messages
from help_center.models import FAQCategory
from help_center.services import get_service_content


def index_view(request):
    context = get_service_content(FAQCategory.FLIGHT)
    return render(request, "website/index.html", context)


def about_view(request):
    return render(request, "website/about.html")


def contact_view(request):
    if request.method == "POST":
        form = ContactForm(request.POST)
        if form.is_valid():
            contact = form.save(commit=False)
            contact.name = "none"
            contact.save()
            messages.success(request, "Your ticket submitted successfully")
            return redirect("website:contact")
    else:
        form = ContactForm()

    return render(request, "website/contact.html", {"form": form})


def Why_view(request):
    return render(request, "website/why_Mine.html")
