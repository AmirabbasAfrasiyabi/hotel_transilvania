from django.urls import path
from help_center.views import *
app_name = ('help_center')
urlpatterns = [
    path('faq', help_center_FAQ, name='FAQ'),
    path('Terms_and_Conditions', help_center_Terms_and_Conditions, name='Terms_and_Conditions'),

]