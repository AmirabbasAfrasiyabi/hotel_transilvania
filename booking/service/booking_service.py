# booking/service/booking_service.py
# Assembled from part modules (size workaround). Behavior is the full BookingService.
from importlib import import_module

_parts = [
    import_module("booking.service._src_part0").SRC,
    import_module("booking.service._src_part1").SRC,
    import_module("booking.service._src_part2").SRC,
    import_module("booking.service._src_part3").SRC,
]
_code = "".join(_parts)
del _parts
exec(compile(_code, __file__, "exec"), globals())
del _code
