# booking/admin.py
from django.contrib import admin
from django.utils.html import format_html
from .models import Booking, Passenger


class PassengerInline(admin.TabularInline):
    model = Passenger
    extra = 0
    fields = (
        "order",
        "passenger_type",
        "title",
        "first_name",
        "last_name",
        "gender",
        "date_of_birth",
        "document_type",
        "national_id",
        "passport_number",
    )
    show_change_link = True


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "transport_type",
        "status",
        "airline_or_company",
        "origin_destination",
        "departure_at",
        "total_price",
        "currency",
        "contact_email",
        "provider",
        "created_at",
    )
    list_filter = (
        "status",
        "transport_type",
        "provider",
        "airline_or_company",          
        "created_at",
        "departure_at",
    )
    search_fields = (
        "id",
        "contact_email",
        "contact_full_name",
        "contact_phone",
        "provider_offer_id",
        "provider_order_id",
        "payment_ref",
        "airline_or_company",
        "flight_or_trip_number",
        "origin_code",
        "destination_code",
        "passengers__first_name",
        "passengers__last_name",
        "passengers__national_id",
        "passengers__passport_number",
    )
    date_hierarchy = "created_at"
    list_per_page = 30
    list_select_related = ("user",)
    ordering = ("-created_at",)
    inlines = [PassengerInline]

    readonly_fields = (
        "created_at",
        "updated_at",
        "offer_snapshot",
    )

    fieldsets = (
        ("Status", {
            "fields": (
                "status",
                "transport_type",
                "user",
            )
        }),
        ("اInformation", {
            "fields": (
                "airline_or_company",
                "flight_or_trip_number",
                "origin_code",
                "destination_code",
                "departure_at",
                "arrival_at",
            )
        }),
        ("Number of passengers", {
            "fields": (
                "adults",
                "children",
                "infants",
            )
        }),
        ("Pricing", {
            "fields": (
                "base_price",
                "taxes",
                "service_price",
                "total_price",
                "currency",
            )
        }),
        ("Contact Information", {
            "fields": (
                "contact_full_name",
                "contact_email",
                "contact_phone",
            )
        }),
        ("Payment", {
            "fields": (
                "payment_ref",
                "payment_authority",
            )
        }),
        ("Provider technical information (usually does not require manual changes)", {
            "classes": ("collapse",),
            "fields": (
                "provider",
                "provider_offer_id",
                "provider_order_id",
                "transport_id",
                "offer_snapshot",
                "session_key",
                "expires_at",
            )
        }),
        ("date", {
            "classes": ("collapse",),
            "fields": (
                "created_at",
                "updated_at",
            )
        }),
    )

    @admin.display(description="مسیر")
    def origin_destination(self, obj):
        origin = obj.origin_code or "—"
        dest = obj.destination_code or "—"
        return f"{origin} → {dest}"