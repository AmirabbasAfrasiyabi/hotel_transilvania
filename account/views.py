from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from .forms import CustomUserCreationForm, CustomAuthenticationForm


def login_view(request):
    if request.method == 'POST':
        form = CustomAuthenticationForm(request=request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect('website:index')
    else:
        form = CustomAuthenticationForm()
    context = {'form': form}
    return render(request, 'account/login.html', context)


@login_required(login_url='/accounts/login/')
def logout_view(request):
    logout(request)
    return redirect('website:index')


def signup_view(request):
    if request.method == "POST":
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('website:index')
    else:
        form = CustomUserCreationForm()

    return render(request, "account/signup.html", {"form": form})