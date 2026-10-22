from booking.service.booking_service import BookingService, BookingServiceError
from booking.service.payment_gate import install as _install_payment_gate

_install_payment_gate(BookingService, BookingServiceError)

__all__ = ["BookingService", "BookingServiceError"]
