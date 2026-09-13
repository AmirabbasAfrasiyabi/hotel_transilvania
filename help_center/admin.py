from django.contrib import admin
from django.utils.html import format_html
from .models import FAQ,Destination


# Register your models here.
@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ['id','question','answer' ,'category' , 'is_active' , 'updated_at']
    list_filter = ['category', 'is_active' , 'id']
    search_fields = ['answer' , 'id' , ]
    list_display_links = ['id','question','answer','updated_at']
    ordering = ['category', 'id']


@admin.register(Destination)
class DestinationAdmin(admin.ModelAdmin):

    list_display = ('image_preview', 'name', 'category', 'is_domestic' ,'is_active', 'display_order', 'updated_at')
    list_display_links = ('name',)
    list_editable = ('is_active', 'display_order')
    list_filter = ('category', 'is_domestic' ,'is_active')
    search_fields = ('name', 'country')
    ordering = ('category', 'display_order', 'name')
    fields = ('category', 'name', 'country','is_domestic', 'image', 'image_preview', 'is_active', 'display_order')
    readonly_fields = ('image_preview',)

    @admin.display(description='preview')
    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="height:60px;border-radius:8px;object-fit:cover;" />',
                obj.image.url,
            )
        return "without picture"
