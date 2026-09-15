from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):

    mobile_validator = RegexValidator(
        regex=r'^09\d{9}$',
        message=_('Enter a valid Iranian mobile number.')
    )

    username = models.CharField(
        _('Phone number'),
        max_length=11,
        unique=True,
        validators=[mobile_validator],
    )

    email = models.EmailField(
        _('Email'),
        unique=True,
        blank=False,
        null=False,
    )

    first_name = models.CharField(
        _('First Name'),
        max_length=30,
        blank=False,
    )
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name=_('groups'),
        blank=True,
        related_name='account_users',
        related_query_name='account_user',
    )

    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name=_('user permissions'),
        blank=True,
        related_name='account_users_permissions',
        related_query_name='account_user_permission',
    )

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    class Meta:
        verbose_name = _('User')
        verbose_name_plural = _('Users')

    def __str__(self):
        return self.username

    def get_full_name(self):
        return self.first_name.strip() if self.first_name else self.username