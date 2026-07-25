from django.contrib import admin
from blog.models import *

# Register your models here.
@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    date_hierarchy = 'published_date'
    empty_value_display = '-empty-'
    list_display = ('id', 'title', 'author', 'counted_views', 'status', 'created_date', 'updated_date')
    list_filter = ('id','status','category','author')
    search_fields = ('title','id','status','author')
    list_per_page = 20

    fieldsets = (
        ('Content Information', {
            'fields': ('title', 'content', 'image')
        }),
        ('Author & Category', {
            'fields': ('author', 'category')
        }),
        ('Publication Settings', {
            'fields': ('status', 'published_date')
        }),
        ('Statistics', {
            'fields': ('counted_views',)
        }),
    )



@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
