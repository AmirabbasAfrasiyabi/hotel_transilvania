import re
from django.core.exceptions import ValidationError
from django.utils.text import camel_case_to_spaces
from django.utils.translation import gettext as _

class UppercaseValidator:
    def validate(self, password, user=None):
        if not re.search('[A-Z]', password):
            raise ValidationError(
                _("The password must contain at least one uppercase English letter (A-Z)."),
                code="password_no_upper",
            )

    def get_help_text(self):
        return _("This password must contain at least one uppercase English letter.")

class LowercaseValidator:

    def validate(self, password, user=None):
        if not re.search('[a-z]', password):
            raise ValidationError(
                _("The password must contain at least one lowercase English letter (a-z)."),
                code="password_no_lower",
            )
    def get_help_text(self):
        return _("This password must contain at least one lowercase English letter (a-z).")

class DigitValidator:

    def validate(self, password, user=None):
        if not re.search(r"\d", password):
            raise ValidationError(
                _("The password must contain at least one number (0-9)."),
                code="password_no_digit",
            )

    def get_help_text(self):
        return _("This password must contain at least one number (0-9).")


class SpecialCharacterValidator:
    """رمز عبور باید حداقل یک کاراکتر خاص داشته باشد."""

    SPECIAL_CHARACTERS = r"!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?"

    def validate(self, password, user=None):
        if not re.search(f"[{re.escape(self.SPECIAL_CHARACTERS)}]", password):
            raise ValidationError(
                _("The password must contain at least one special character (!@#$%^&*, etc.)."),
                code="password_no_special",
            )

    def get_help_text(self):
        return _("The password must contain at least one special character (!@#$%^&*, etc.).")