# booking/service/booking_service.py
from pathlib import Path
_dir = Path(__file__).resolve().parent
_code = "".join((_dir / f"_p0_part{i}.txt").read_text() for i in range(5))
exec(compile(_code, __file__, "exec"), globals())
del Path, _dir, _code
