from django.urls import path
from . import views

app_name = 'booking'

urlpatterns = [
    path("select-offer/", views.select_offer_view, name="select_offer"),
    path("passengers/<int:booking_id>/", views.passenger_details_view, name="passengers"),
    path("services/<int:booking_id>/", views.travel_services_view, name="services"),
    path("review/<int:booking_id>/", views.review_view, name="review"),
    path("api/revalidate/<int:booking_id>/", views.revalidate_api, name="revalidate_api"),
    path("api/confirm/<int:booking_id>/", views.confirm_booking_view, name="confirm"),
    path("confirmation/<int:booking_id>/", views.confirmation_view, name="confirmation"),
]
