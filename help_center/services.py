from .models import FAQ, Destination, FAQCategory


def get_service_content(category, split_domestic: bool = False) -> dict:
    """
    category می‌تواند یک مقدار FAQCategory یا لیستی از آن‌ها باشد.
    split_domestic=True → مقصدها را با فیلد is_domestic جدا می‌کند
    (دیگر وابسته به DOMESTIC_FLIGHT / INTERNATIONAL_FLIGHT نیست).
    """
    categories = list(category) if isinstance(category, (list, tuple, set)) else [category]

    destinations = Destination.objects.for_category(
        categories if len(categories) > 1 else categories[0]
    )
    faqs = FAQ.objects.for_category(
        categories if len(categories) > 1 else categories[0]
    )

    context = {
        'faqs': faqs,
        'popular_destinations': destinations,
    }

    if split_domestic:
        # جداسازی فقط بر اساس فیلد is_domestic مدل Destination
        context['popular_destinations_domestic'] = destinations.filter(is_domestic=True)
        context['popular_destinations_international'] = destinations.filter(is_domestic=False)

    return context
