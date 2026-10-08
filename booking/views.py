from django.shortcuts import render,redirect
from django.contrib.auth.decorators import login_required

# Create your views here.

@login_required

def passenger_details_view(request):
    offer_id= request.GET.get('offer')
    if not offer_id:
        return redirect('transport:flight_results')

    context = {
        'offer_id':offer_id
    }
    return render(
        request,'booking/passengers.html',context
    )