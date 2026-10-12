from django.contrib import admin
from  .models import  Airline, Airport , Flight , FlightFare

# Register your models here.

class FlightFareInline(admin.TabularInline):
    model = FlightFare
    extra = 1
    fields = (
        "cabin_class",
        "price",
        "available_seats",
        "refundable",
        "changeable",
    )

@admin.register(Airline)
class AirlineAdmin(admin.ModelAdmin):
    list_display = ("name","iata_code","icao_code","is_active","created_at","updated_at",)
    list_filter = ("created_at","updated_at")
    search_fields = ("name","iata_code","icao_code")
    list_per_page = 50
    list_editable = ("is_active",)
    readonly_fields = ("created_at","updated_at")

@admin.register(Airport)
class AirportAdmin(admin.ModelAdmin):
    list_display = ("name","iata_code","icao_code","city","country","is_active","created_at","updated_at",)
    list_filter = ("created_at","updated_at")
    search_fields = ("name","iata_code","icao_code" , "city","country")
    list_per_page = 50
    list_editable = ("is_active",)
    readonly_fields = ("created_at","updated_at")

@admin.register(Flight)
class FlightAdmin(admin.ModelAdmin):
    list_display = (
        "flight_number",
        "origin",
        "destination",
        "departure_at",
        "arrival_at",
        "total_capacity",
        "available_seats",
        "baggage_allowance",
        "created_at",
        "updated_at",
        "is_active",
    )
    list_select_related = ("airline", "origin", "destination")
    list_filter = ("status", "trip_type", "is_active", "airline", "origin", "destination")
    search_fields = ("flight_number", "airline__iata_code", "origin__iata_code", "destination__iata_code")

    date_hierarchy = "departure_at"
    readonly_fields = ("duration_minutes", "created_at", "updated_at")
    inlines = (FlightFareInline,)

    fieldsets = (
        (None, {
            "fields": (
                "airline",
                "flight_number",
                "origin",
                "destination",
                "trip_type"
            )
        }),
        ("Schedule", {
            "fields": (
                "departure_at",
                "arrival_at",
                "duration_minutes",
            )
        }),
        ("Pricing & Capacity", {
            "fields": (
                "base_price",
                "currency",
                "total_capacity",
                "available_seats",
            )
        }),
        ("Sales Control", {
            "fields": (
                "status",
                "sale_start_at",
                "sale_end_at",
                "is_active",
            )
        }),
        ("Policies & Extra", {
            "fields": (
                "baggage_allowance",
                "refund_policy",
                "description",
            ),
            "classes": ("collapse",),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    def is_sellable_display(self, obj):
        return obj.is_sellable

    is_sellable_display.boolean = True
    is_sellable_display.short_description = "Sellable"

@admin.register(FlightFare)
class FlightFareAdmin(admin.ModelAdmin):
    list_display = (
        "flight",
        "cabin_class",
        "price",
        "available_seats",
        )
    list_filter = ("cabin_class", "refundable", "changeable")
    search_fields = (
        "flight__flight_number",
        "flight__airline__iata_code",
    )