from .models import FAQ ,Destination
def get_service_content(category: str) -> dict:
    return {
        'faqs': FAQ.objects.for_category(category),
        'popular_destinations': Destination.objects.for_category(category),
    }
