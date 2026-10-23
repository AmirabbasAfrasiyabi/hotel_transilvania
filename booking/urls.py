from django.urls import path
from . import views

app_name = 'booking'

urlpatterns = [
    path("select-offer/", views.select_offer_view, name="select_offer"),
    path("passengers/<int:booking_id>/", views.passenger_details_view, name="passengers"),
    path("services/<int:booking_id>/", views.travel_services_view, name="services"),
    path("review/<int:booking_id>/", views.review_view, name="review"),
    path("payment/<int:booking_id>/", views.payment_view, name="payment"),
    path("api/revalidate/<int:booking_id>/", views.revalidate_api, name="revalidate_api"),
    path("api/prepare-payment/<int:booking_id>/", views.prepare_payment_view, name="prepare_payment"),
    path("api/payment-callback/<int:booking_id>/", views.payment_callback_view, name="payment_callback"),
    path("api/zarinpal/start/<int:booking_id>/", views.zarinpal_start_view, name="zarinpal_start"),
    path("api/zarinpal/callback/<int:booking_id>/", views.zarinpal_callback_view, name="zarinpal_callback"),
    path("api/confirm/<int:booking_id>/", views.confirm_booking_view, name="confirm"),
    path("confirmation/<int:booking_id>/", views.confirmation_view, name="confirmation"),
]
