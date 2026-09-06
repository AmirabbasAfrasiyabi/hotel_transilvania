from django.contrib import admin

from .models import FAQ


# Register your models here.
@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ['id','question','answer' ,'category' , 'is_active' , 'updated_at']
    list_filter = ['category', 'is_active' , 'id']
    search_fields = ['answer' , 'id' , ]
    list_display_links = ['id','question','answer','updated_at']
    ordering = ['category', 'id']
