from django.shortcuts import render, redirect, resolve_url
from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.urls import reverse
from django.utils.http import url_has_allowed_host_and_scheme
from .forms import CustomUserCreationForm, CustomAuthenticationForm


def _safe_next(request, default='website:index'):
    next_url = request.POST.get('next') or request.GET.get('next')
    if next_url and url_has_allowed_host_and_scheme(
        url=next_url,
        allowed_hosts={request.get_host()},
        require_https=request.is_secure(),
    ):
        return next_url
    return resolve_url(default)


def login_view(request):
    if request.user.is_authenticated:
        return redirect(_safe_next(request))

    if request.method == 'POST':
        form = CustomAuthenticationForm(request=request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect('website:index')
    else:
        form = CustomAuthenticationForm()

    context = {'form': form, 'next': _safe_next(request)}
    return render(request, 'account/login.html', context)


@login_required(login_url='/accounts/login/')
def logout_view(request):
    logout(request)
    return redirect('website:index')


def signup_view(request):
    if request.user.is_authenticated:
        return redirect(_safe_next(request))

    if request.method == "POST":
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()

            login(request, user)
            return redirect(_safe_next(request))
    else:
        form = CustomUserCreationForm()


    return render(request, "account/signup.html",
           {"form": form, "next": _safe_next(request)})


def admin_login_bridge(request):
    next_url = _safe_next(request, default='admin:index')

    if not request.user.is_authenticated:
        return redirect(f"{reverse('account:login')}?next={next_url}")

    if request.user.is_active and request.user.is_staff:
        return redirect(next_url)

    messages.error(
        request,
        "Your account is signed in, but it does not have admin panel access."
    )
    return redirect('website:index')