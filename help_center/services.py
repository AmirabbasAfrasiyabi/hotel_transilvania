from .models import FAQ, Destination, FAQCategory


def get_service_content(category, split_domestic: bool = False) -> dict:
    """
    category می‌تواند یک مقدار FAQCategory یا لیستی از آن‌ها باشد.

    مقاصد و FAQهای فعال همان دسته‌بندی را برمی‌گرداند.
    """
    categories = list(category) if isinstance(category, (list, tuple, set)) else [category]
    cat = categories if len(categories) > 1 else categories[0]

    destinations = Destination.objects.filter(
        is_active=True,
    )
    if isinstance(cat, (list, tuple)):
        destinations = destinations.filter(category__in=cat)
    else:
        destinations = destinations.filter(category=cat)
    destinations = destinations.order_by("display_order", "name")

    faqs = FAQ.objects.filter(is_active=True)
    if isinstance(cat, (list, tuple)):
        faqs = faqs.filter(category__in=cat)
    else:
        faqs = faqs.filter(category=cat)
    faqs = faqs.order_by("display_order", "id")

    return {
        "faqs": faqs,
        "popular_destinations": destinations,
    }
