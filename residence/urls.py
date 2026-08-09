from django.urls import path
from residence.views import *
app_name = 'residence'
urlpatterns = [
    path('hotel' , hotel_view , name="hotel"),
    path ('village' , village_view ,name="village"),
]