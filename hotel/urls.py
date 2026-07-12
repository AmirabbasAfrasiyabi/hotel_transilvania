from django.urls import path
from hotel.views import *
app_name = 'hotel'
urlpatterns = [
    path('', hotel_view, name='index'),
]