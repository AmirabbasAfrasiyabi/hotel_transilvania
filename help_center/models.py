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
    FLIGHT = "flight", "Flight"
    TRAIN = "train", "Train"
    BUS = "bus", "Bus"
    HOTEL = "hotel", "Hotel"
    VILLA = "villa", "Villa"
    TOUR = "tour", "Tour"
    GENERAL = "general", "General"


class FAQManager(ServiceContentManager):
    pass


class FAQ(models.Model):
    category = models.CharField(
        max_length=30,
        choices=FAQCategory.choices,
        default=FAQCategory.FLIGHT,
        db_index=True,
        verbose_name="Category",
    )
    question = models.CharField(max_length=300, verbose_name="question")
    answer = RichTextField(verbose_name="answer")
    is_active = models.BooleanField(default=True, verbose_name="is_active")
    display_order = models.PositiveIntegerField(default=0, verbose_name="display_order")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="created_at")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="updated_at")

    objects = FAQManager()

    class Meta:
        ordering = ["category", "display_order", "id"]
        verbose_name = "faq"
        verbose_name_plural = "faqs"

    def __str__(self):
        return self.question


class DestinationManager(ServiceContentManager):
    pass


class DestinationCountry(models.TextChoices):
    """کشورهای پرکاربرد برای مقاصد خارجی"""
    TURKEY = "Turkey", "Turkey"
    UAE = "United Arab Emirates", "United Arab Emirates"
    GERMANY = "Germany", "Germany"
    FRANCE = "France", "France"
    ITALY = "Italy", "Italy"
    SPAIN = "Spain", "Spain"
    UK = "United Kingdom", "United Kingdom"
    NETHERLANDS = "Netherlands", "Netherlands"
    SWITZERLAND = "Switzerland", "Switzerland"
    AUSTRIA = "Austria", "Austria"
    GREECE = "Greece", "Greece"
    GEORGIA = "Georgia", "Georgia"
    ARMENIA = "Armenia", "Armenia"
    AZERBAIJAN = "Azerbaijan", "Azerbaijan"
    RUSSIA = "Russia", "Russia"
    CHINA = "China", "China"
    JAPAN = "Japan", "Japan"
    THAILAND = "Thailand", "Thailand"
    MALAYSIA = "Malaysia", "Malaysia"
    INDONESIA = "Indonesia", "Indonesia"
    INDIA = "India", "India"
    QATAR = "Qatar", "Qatar"
    SAUDI_ARABIA = "Saudi Arabia", "Saudi Arabia"
    OMAN = "Oman", "Oman"
    KUWAIT = "Kuwait", "Kuwait"
    IRAQ = "Iraq", "Iraq"
    CYPRUS = "Cyprus", "Cyprus"
    USA = "United States", "United States"
    CANADA = "Canada", "Canada"
    AUSTRALIA = "Australia", "Australia"
    OTHER = "Other", "Other"


class DestinationCity(models.TextChoices):
    """شهرهای پرکاربرد بین‌المللی"""
    # Turkey
    ISTANBUL = "Istanbul", "Istanbul"
    ANTALYA = "Antalya", "Antalya"
    ANKARA = "Ankara", "Ankara"
    IZMIR = "Izmir", "Izmir"
    TRABZON = "Trabzon", "Trabzon"
    # UAE
    DUBAI = "Dubai", "Dubai"
    ABU_DHABI = "Abu Dhabi", "Abu Dhabi"
    SHARJAH = "Sharjah", "Sharjah"
    # Europe
    PARIS = "Paris", "Paris"
    LONDON = "London", "London"
    ROME = "Rome", "Rome"
    MILAN = "Milan", "Milan"
    BARCELONA = "Barcelona", "Barcelona"
    MADRID = "Madrid", "Madrid"
    BERLIN = "Berlin", "Berlin"
    MUNICH = "Munich", "Munich"
    FRANKFURT = "Frankfurt", "Frankfurt"
    AMSTERDAM = "Amsterdam", "Amsterdam"
    VIENNA = "Vienna", "Vienna"
    ZURICH = "Zurich", "Zurich"
    ATHENS = "Athens", "Athens"
    # Caucasus / nearby
    TBILISI = "Tbilisi", "Tbilisi"
    YEREVAN = "Yerevan", "Yerevan"
    BAKU = "Baku", "Baku"
    # Middle East
    DOHA = "Doha", "Doha"
    RIYADH = "Riyadh", "Riyadh"
    JEDDAH = "Jeddah", "Jeddah"
    MUSCAT = "Muscat", "Muscat"
    KUWAIT_CITY = "Kuwait City", "Kuwait City"
    BAGHDAD = "Baghdad", "Baghdad"
    LARNACA = "Larnaca", "Larnaca"
    # Asia
    BEIJING = "Beijing", "Beijing"
    SHANGHAI = "Shanghai", "Shanghai"
    TOKYO = "Tokyo", "Tokyo"
    BANGKOK = "Bangkok", "Bangkok"
    KUALA_LUMPUR = "Kuala Lumpur", "Kuala Lumpur"
    BALI = "Bali", "Bali"
    DELHI = "Delhi", "Delhi"
    MUMBAI = "Mumbai", "Mumbai"
    # Other
    MOSCOW = "Moscow", "Moscow"
    NEW_YORK = "New York", "New York"
    LOS_ANGELES = "Los Angeles", "Los Angeles"
    TORONTO = "Toronto", "Toronto"
    SYDNEY = "Sydney", "Sydney"
    OTHER = "Other", "Other"


class Destination(models.Model):

    category = models.CharField(
        max_length=30,
        choices=FAQCategory.choices,
        default=FAQCategory.FLIGHT,
        db_index=True,
        verbose_name="category",
    )
    name = models.CharField(
        max_length=100,
        choices=DestinationCity.choices,
        verbose_name="Destination Name",
    )
    country = models.CharField(
        max_length=100,
        choices=DestinationCountry.choices,
        blank=True,
        default="",
        verbose_name="Country",
    )
    image = models.ImageField(upload_to="images/", null=True, blank=True)

    is_active = models.BooleanField(default=True, verbose_name="is_active")
    display_order = models.PositiveIntegerField(default=0, verbose_name="display_order")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="created_at")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="updated_at")

    objects = DestinationManager()

    class Meta:
        ordering = ["category", "display_order", "name"]
        verbose_name = "Destination"
        verbose_name_plural = "Destinations"

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"
