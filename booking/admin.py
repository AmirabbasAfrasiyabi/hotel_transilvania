# booking/admin.py
from django.contrib import admin
from .models import Booking, Passenger


class PassengerInline(admin.TabularInline):
    model = Passenger
    extra = 0


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "id", "transport_type", "status", "total_price",
        "currency", "contact_email", "created_at",
    )
    list_filter = ("status", "transport_type", "provider")
    search_fields = ("contact_email", "provider_offer_id", "provider_order_id")
    inlines = [PassengerInline]
    readonly_fields = ("created_at", "updated_at")