from django.shortcuts import render, redirect
from django.contrib.auth import login , logout
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.decorators import login_required
# =========================
# Login
# =========================

def login_view(request):

    if request.method == 'POST':
        form = AuthenticationForm(request=request,data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect('website:index')
    else:
        form = AuthenticationForm()
    context = {'form': form}
    return render(request,'account/login.html',context)

# =========================
# Logout
# =========================

@login_required(login_url='/accounts/login/')
def logout_view(request):
    logout(request)
    return redirect('website:index')


# =========================
# Signup
# =========================

def signup_view(request):
    return render(request,'account/signup.html')
