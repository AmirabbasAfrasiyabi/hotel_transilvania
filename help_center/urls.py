from django.urls import path
from help_center.views import *
app_name = ('help_center')
urlpatterns = [
    path('Faq', help_center_FAQ, name='FAQ'),
    path('Terms_and_Conditions', help_center_Terms_and_Conditions, name='Terms_and_Conditions'),
    path('Buying_guide' , Buying_Guide, name='Buying_Guide'),
    path('Refound_Guide' , Refound_Guide, name='Refound_Guide'),

]