from django.db import models
from ckeditor.fields import RichTextField
class ServiceContentManager(models.Manager):

    def for_category(self, category, active_only=True):
        if isinstance(category, (list, tuple, set)):
            qs = self.get_queryset().filter(category__in=category)
        else:
            qs = self.get_queryset().filter(category=category)
        if active_only:
            qs = qs.filter(is_active=True)
        return qs

class FAQCategory(models.TextChoices):

    DOMESTIC_FLIGHT = 'domestic_flight',
    INTERNATIONAL_FLIGHT = 'international_flight',
    TRAIN = 'train',
    BUS = 'bus',
    HOTEL = 'hotel',
    VILLA = 'villa',
    TOUR = 'tour',
    GENERAL = 'general',


class FAQManager(ServiceContentManager):
    pass

class FAQ(models.Model):
    category = models.CharField(
        max_length=30,
        choices=FAQCategory.choices,
        default=FAQCategory.DOMESTIC_FLIGHT,
        db_index=True,
        verbose_name='Category',
    )
    question = models.CharField(max_length=300, verbose_name='question')
    answer = RichTextField(verbose_name='answer')
    is_active = models.BooleanField(default=True, verbose_name='is_active')
    display_order = models.PositiveIntegerField(default=0, verbose_name='display_order')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='created_at')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='updated_at')

    objects = FAQManager()

    class Meta:
        ordering = ['category', 'display_order', 'id']
        verbose_name = 'faq'
        verbose_name_plural = 'faqs'

    def __str__(self):
        return self.question


class DestinationManager(ServiceContentManager):
    pass


class Destination(models.Model):

    category = models.CharField(
        max_length=30,
        choices=FAQCategory.choices,
        default=FAQCategory.DOMESTIC_FLIGHT,
        db_index=True,
        verbose_name='category',
    )
    name = models.CharField(max_length=100, verbose_name="Destination Name")
    country = models.CharField(max_length=100, blank=True, default='', verbose_name="Country")
    image = models.ImageField(upload_to="images/", null=True, blank=True)
    is_domestic = models.BooleanField(
        null=True,
        blank=True,
        default=None,
        verbose_name="Domestic",
    )

    is_active = models.BooleanField(default=True, verbose_name="is_active")
    display_order = models.PositiveIntegerField(default=0, verbose_name="display_order")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="created_at")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="updated_at")

    objects = DestinationManager()

    class Meta:
        ordering = ['category', 'display_order', 'name']
        verbose_name = 'Destination'
        verbose_name_plural = 'Destinations'

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"