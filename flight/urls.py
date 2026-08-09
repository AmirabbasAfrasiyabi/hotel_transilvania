from django.urls import path
from blog import views
from flight.views import international_flight , domestic_flight
app_name = ('flight')
urlpatterns = [
    path('international', international_flight, name='international'),
    path('' ,domestic_flight, name='domestic'),
]