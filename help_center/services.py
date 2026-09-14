from .models import FAQ ,Destination,FAQCategory
def get_service_content(category: str, split_domestic: bool = False) -> dict:

    categories = list(category) if isinstance(category, (list, tuple, set)) else [category]
    destinations = Destination.objects.for_category(categories if len(categories) > 1 else category)
    context = {
        'faqs': FAQ.objects.for_category(categories if len(categories) > 1 else category),
        'popular_destinations': destinations,
    }
    if split_domestic:
        is_flight_merge = set(categories) == {FAQCategory.DOMESTIC_FLIGHT, FAQCategory.INTERNATIONAL_FLIGHT}
        if is_flight_merge:
          
            context['popular_destinations_domestic'] = destinations.filter(category=FAQCategory.DOMESTIC_FLIGHT)
            context['popular_destinations_international'] = destinations.filter(
                category=FAQCategory.INTERNATIONAL_FLIGHT)
        else:
            context['popular_destinations_domestic'] = destinations.filter(is_domestic=True)
            context['popular_destinations_international'] = destinations.filter(is_domestic=False)
    return context
