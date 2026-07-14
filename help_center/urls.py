from django.urls import path
from help_center.views import *
app_name = ('help_center')
urlpatterns = [
    path('', help_center_FAQ, name='FAQ'),
]