from django.http import HttpResponse
from django.shortcuts import render
from help_center.models import FAQCategory
from help_center.services import get_service_content

def packages_view(request):
    context = get_service_content(FAQCategory.TOUR)
    return render(request,'packages/packages.html',context)

