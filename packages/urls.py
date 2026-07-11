from django.urls import path
from packages.views import *
app_name = 'packages'
urlpatterns = [
    path('', packages_view, name='index'),
    path('hotel', hotel_view, name='hotel'),

]