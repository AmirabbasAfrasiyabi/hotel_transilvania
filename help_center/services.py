from .models import FAQ ,Destination
def get_service_content(category: str, split_domestic: bool = False) -> dict:
    
    destinations = Destination.objects.for_category(category)
    context = {
        'faqs': FAQ.objects.for_category(category),
        'popular_destinations': destinations,
    }
    if split_domestic:
        context['popular_destinations_domestic'] = destinations.filter(is_domestic=True)
        context['popular_destinations_international'] = destinations.filter(is_domestic=False)
    return context
