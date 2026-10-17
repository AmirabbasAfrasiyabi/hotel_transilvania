# booking/forms.py
from django import forms
from django.forms import inlineformset_factory

from .models import Booking, Passenger


class ContactForm(forms.Form):
    contact_full_name = forms.CharField(max_length=200, required=True)
    contact_email = forms.EmailField(required=True)
    contact_phone = forms.CharField(max_length=30, required=True)


class PassengerForm(forms.ModelForm):
    class Meta:
        model = Passenger
        fields = [
            "title",
            "first_name",
            "last_name",
            "gender",
            "date_of_birth",
            "nationality",
            "passport_number",
            "passport_issuing_country",
            "passport_expiry",
            "passenger_type",
            "order",
        ]
        widgets = {
            "date_of_birth": forms.DateInput(attrs={"type": "date"}),
            "passport_expiry": forms.DateInput(attrs={"type": "date"}),
        }

    def clean_first_name(self):
        value = (self.cleaned_data.get("first_name") or "").strip()
        if not value:
            raise forms.ValidationError("First name is required.")
        return value

    def clean_last_name(self):
        value = (self.cleaned_data.get("last_name") or "").strip()
        if not value:
            raise forms.ValidationError("Last name is required.")
        return value


PassengerFormSet = inlineformset_factory(
    Booking,
    Passenger,
    form=PassengerForm,
    extra=0,
    can_delete=False,
    min_num=1,
    validate_min=True,
)