import json

from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .destination_data import CITY_TO_COUNTRY
from .models import FAQ, Destination


@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ["id", "question", "answer", "category", "is_active", "updated_at"]
    list_filter = ["category", "is_active", "id"]
    search_fields = ["answer", "id"]
    list_display_links = ["id", "question", "answer", "updated_at"]
    ordering = ["category", "id"]


@admin.register(Destination)
class DestinationAdmin(admin.ModelAdmin):

    list_display = (
        "image_preview",
        "name",
        "country",
        "category",
        "is_active",
        "display_order",
        "updated_at",
    )
    list_display_links = ("name",)
    list_editable = ("is_active", "display_order")
    list_filter = ("category", "country", "is_active")
    search_fields = ("name", "country")
    ordering = ("category", "display_order", "name")
    fields = (
        "category",
        "name",
        "country",
        "image",
        "image_preview",
        "is_active",
        "display_order",
    )
    readonly_fields = ("image_preview",)

    class Media:
        js = ("admin/js/destination_city_country.js",)

    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):
        extra_context = extra_context or {}
        extra_context["city_to_country_json"] = mark_safe(
            json.dumps(CITY_TO_COUNTRY, ensure_ascii=False)
        )
        return super().changeform_view(request, object_id, form_url, extra_context)

    @admin.display(description="preview")
    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="height:60px;border-radius:8px;object-fit:cover;" />',
                obj.image.url,
            )
        return "without picture"
