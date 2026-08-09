from django.urls import path
from transport.views import *
app_name = 'transport'
urlpatterns = [
    path('flight/out', Flight_view, name='out'),
    path('Train', Train_view, name='train'),
    path ("Bus" , Bus_view , name="bus"),
]