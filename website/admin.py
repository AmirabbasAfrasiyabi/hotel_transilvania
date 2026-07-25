from django.contrib import admin
from .models import Contact

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