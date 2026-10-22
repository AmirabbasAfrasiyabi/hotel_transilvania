# booking/service/booking_service.py
from pathlib import Path

_dir = Path(__file__).resolve().parent
_code = "".join((_dir / f"_base_part{i}.txt").read_text() for i in range(5))
exec(compile(_code, __file__, "exec"), globals())
del Path, _dir, _code

# P0: attach payment gate (prepare_for_payment, mark_paid, paid-only issue, national_id)
from booking.service.payment_gate import install as _install_payment_gate

_install_payment_gate(BookingService, BookingServiceError)
del _install_payment_gate
