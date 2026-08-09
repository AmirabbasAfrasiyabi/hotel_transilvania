from django.urls import path
from website.views import *
app_name = 'website'
urlpatterns = [
    path('', index_view, name='index'),
    path('about', about_view, name='about'),
    path('contact', contact_view, name='contact'),
    path ("Why_Mine" , Why_view , name="Why_Mine"),
    path('train' , train_view , name="train"),

]