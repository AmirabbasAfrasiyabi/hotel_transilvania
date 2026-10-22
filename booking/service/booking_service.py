# booking/service/booking_service.py
# Loads full implementation from adjacent _raw_part*.txt fragments.
from pathlib import Path

_dir = Path(__file__).resolve().parent
_code = "".join((_dir / f"_raw_part{i}.txt").read_text() for i in range(5))
exec(compile(_code, __file__, "exec"), globals())
del _dir, _code, Path
