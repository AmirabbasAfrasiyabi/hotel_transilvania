from django.shortcuts import render

# Create your views here.

def help_center_FAQ(request):
    return render(request,'help_center/help_center_FAQ.html')