# booking/forms.py
import re

from django import forms
from django.core.exceptions import ValidationError
from django.forms import inlineformset_factory

from .models import Booking, Passenger


def _iran_national_id_valid(code: str) -> bool:
    """Validate Iranian national ID (10 digits + check digit algorithm)."""
    if not code or not re.fullmatch(r"\d{10}", code):
        return False
    if code == code[0] * 10:
        return False
    check = int(code[9])
    s = sum(int(code[i]) * (10 - i) for i in range(9)) % 11
    return (s < 2 and check == s) or (s >= 2 and check == 11 - s)


class ContactForm(forms.Form):
    contact_full_name = forms.CharField(
        max_length=200, required=True, label="نام کامل تماس"
    )
    contact_email = forms.EmailField(required=True, label="ایمیل")
    contact_phone = forms.CharField(max_length=30, required=True, label="تلفن")

    def clean_contact_phone(self):
        phone = re.sub(r"\D", "", self.cleaned_data.get("contact_phone") or "")
        if len(phone) < 10:
            raise ValidationError("شماره تلفن معتبر نیست.")
        return phone

    def clean_contact_full_name(self):
        value = (self.cleaned_data.get("contact_full_name") or "").strip()
        if len(value) < 2:
            raise ValidationError("نام کامل تماس الزامی است.")
        return value


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
            "document_type",
            "national_id",
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
            raise ValidationError("نام الزامی است.")
        return value

    def clean_last_name(self):
        value = (self.cleaned_data.get("last_name") or "").strip()
        if not value:
            raise ValidationError("نام خانوادگی الزامی است.")
        return value

    def clean_national_id(self):
        value = (self.cleaned_data.get("national_id") or "").strip()
        if not value:
            return value
        if not _iran_national_id_valid(value):
            raise ValidationError("کد ملی معتبر نیست.")
        return value

    def clean(self):
        cleaned = super().clean()
        doc_type = (cleaned.get("document_type") or "").strip()
        national_id = (cleaned.get("national_id") or "").strip()
        passport = (cleaned.get("passport_number") or "").strip()
        passport_expiry = cleaned.get("passport_expiry")

        if doc_type == Passenger.DocumentType.NATIONAL_ID and not national_id:
            self.add_error("national_id", "برای مدرک کد ملی، وارد کردن کد ملی الزامی است.")
        if doc_type == Passenger.DocumentType.PASSPORT:
            if not passport:
                self.add_error(
                    "passport_number", "برای مدرک پاسپورت، شماره پاسپورت الزامی است."
                )
            if not passport_expiry:
                self.add_error(
                    "passport_expiry", "تاریخ انقضای پاسپورت الزامی است."
                )
        return cleaned


PassengerFormSet = inlineformset_factory(
    Booking,
    Passenger,
    form=PassengerForm,
    extra=0,
    can_delete=False,
    min_num=1,
    validate_min=True,
)
