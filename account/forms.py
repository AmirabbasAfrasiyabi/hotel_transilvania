from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _

User = get_user_model()


class CustomUserCreationForm(UserCreationForm):
    first_name = forms.CharField(
        required=True,
        label=_("Full Name"),
        max_length=150,
        widget=forms.TextInput(attrs={
            "placeholder": "Amirabbas",
            "autocomplete": "name",
        })
    )

    email = forms.EmailField(
        required=True,
        label=_("ایمیل"),
        widget=forms.EmailInput(attrs={
            "placeholder": "example@email.com",
            "autocomplete": "email",
        })
    )

    class Meta:
        model = User
        fields = ["first_name", "username", "email", "password1", "password2"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["username"].label = _("Phone number")
        self.fields["username"].widget.attrs.update({
            "placeholder": "09123456789",
            "inputmode": "numeric",
            "autocomplete": "tel",
        })


class CustomAuthenticationForm(AuthenticationForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["username"].label = _("Phone number")
        self.fields["username"].widget.attrs.update({
            "placeholder": "09123456789",
            "input_mode": "numeric",
            "autocomplete": "tel",
        })
        self.fields["password"].label = _("Password")