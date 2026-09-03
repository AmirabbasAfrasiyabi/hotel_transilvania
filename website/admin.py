from django.contrib import admin
from django.utils.html  import  format_html
from .models import Contact  , Destination

@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'subject', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('name', 'email', 'subject', 'message')
    readonly_fields = ('created', 'updated')

    fieldsets = (
        ('Contact Information', {
            'fields': ('name', 'email')
        }),
        ('Message Details', {
            'fields': ('subject', 'message')
        }),
        ('Timestamps', {
            'fields': ('created', 'updated'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Created At')
    def created(self, obj):
        return obj.created_at

    @admin.display(description='Updated At')
    def updated(self, obj):
        return obj.updated_at


@admin.register(Destination)
class DestinationAdmin(admin.ModelAdmin):
    list_display = ('image_preview', 'name', 'is_active', 'display_order', 'updated_at')
    list_display_links = ('name',)
    list_editable = ('is_active', 'display_order')
    list_filter = ('is_active',)
    search_fields = ('name',)
    ordering = ('display_order', 'name')
    fields = ('name', 'image', 'image_preview', 'is_active', 'display_order')
    readonly_fields = ('image_preview',)

    @admin.display(description='preview')
    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="height:60px;border-radius:8px;object-fit:cover;" />',
                obj.image.url,
            )
        return "without picture"