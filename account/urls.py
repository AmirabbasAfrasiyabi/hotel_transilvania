from django.urls import path
from . import views
from account.views import login_view , signup_view , logout_view
app_name = ('account')
urlpatterns = [
    path('login',views.login_view,name='login'),
    path('logout',views.logout_view,name='logout'),
    path('signup',views.signup_view,name='signup'),
]