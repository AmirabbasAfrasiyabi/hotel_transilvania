from django.shortcuts import render

# Create your views here.

def help_center_FAQ(request):
    return render(request,'help_center/FAQ.html')

def help_center_Terms_and_Conditions(request):
    return render(request,'help_center/Terms_and_Conditions.html')

def Buying_Guide(request):
    return render(request,'help_center/Buying_Guide.html')

def Refound_Guide(request):
    return render(request,'help_center/Refound_Guide.html')