from django.urls import path
from . import views

app_name = 'booking'

urlpatterns = [
    path('passengers/', views.passenger_details_view, name='passengers'),
]