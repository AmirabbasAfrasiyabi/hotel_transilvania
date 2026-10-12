from django.urls import path
from . import  views
app_name = 'transport'
urlpatterns = [
    # Frontend pages
    path('flight', views.Flight_view, name='out'),
    path('Train', views.Train_view, name='train'),
    path ("Bus" , views.Bus_view , name="bus"),
    path('flights/results/', views.flight_results_view, name='flight_results'),

# APIs
    path("api/flights/search/", views.flight_search_api, name="flight_search_api"),
    path("api/v1/flights/internal/", views.internal_flight_search_api, name="internal_flight_search"),
    path("api/v1/flights/hybrid/", views.hybrid_flight_search_api, name="hybrid_flight_search"),
]