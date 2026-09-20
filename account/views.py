from django.shortcuts import render, redirect, resolve_url
from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.urls import reverse
from django.utils.http import url_has_allowed_host_and_scheme
from .forms import CustomUserCreationForm, CustomAuthenticationForm
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect


REDIRECT_FIELD_NAME = "next"


def _safe_redirect_target(request, fallback="website:index"):

    target = request.POST.get(REDIRECT_FIELD_NAME) or request.GET.get(REDIRECT_FIELD_NAME)

    if target and url_has_allowed_host_and_scheme(
        url=target,
        allowed_hosts={request.get_host()},
        require_https=request.is_secure(),
    ):
        return target

    return resolve_url(fallback)


@never_cache
@csrf_protect
def login_view(request):
    redirect_to = _safe_redirect_target(request)
    if request.user.is_authenticated:
        return redirect(redirect_to)

    if request.method == 'POST':
        form = CustomAuthenticationForm(request=request, data=request.POST)
        if form.is_valid():
            login(request, form.get_user())
            messages.success(request, "Welcome back!")
            return redirect(redirect_to)
    else:
        form = CustomAuthenticationForm()

    return render(request,"account/login.html",{"form": form, REDIRECT_FIELD_NAME: redirect_to},)


@never_cache
def logout_view(request):
    if request.user.is_authenticated:
        logout(request)
        messages.info(request, "You have been signed out.")
    return redirect("website:index")


def signup_view(request):
    redirect_to = _safe_redirect_target(request)
    if request.user.is_authenticated:
        return redirect(redirect_to)

    if request.method == "POST":
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()

            login(request, user)
            messages.success(request, "Your account is ready.")
            return redirect(redirect_to)
    else:
        form = CustomUserCreationForm()

    return render(
        request,
        "account/signup.html",
        {"form": form, REDIRECT_FIELD_NAME: redirect_to},
    )

