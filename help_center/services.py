from .models import FAQ, Destination, FAQCategory


def get_service_content(category, split_domestic: bool = False) -> dict:
    """
    category می‌تواند یک مقدار FAQCategory یا لیستی از آن‌ها باشد.

    فقط مقاصد فعال همان دسته‌بندی برگردانده می‌شوند.
    پارامتر split_domestic دیگر استفاده نمی‌شود و فقط برای سازگاری نگه داشته شده است.
    """
    categories = list(category) if isinstance(category, (list, tuple, set)) else [category]

    destinations = Destination.objects.for_category(
        categories if len(categories) > 1 else categories[0]
    ).exclude(country__icontains="iran")

    faqs = FAQ.objects.for_category(
        categories if len(categories) > 1 else categories[0]
    )

    return {
        "faqs": faqs,
        "popular_destinations": destinations,
    }
