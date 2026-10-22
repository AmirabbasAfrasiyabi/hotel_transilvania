# booking/service/_install_parts.py
"""One-shot: write _src_part{1,2,3}.py from adjacent .b64 files, then can be deleted."""
from pathlib import Path
import base64

HERE = Path(__file__).resolve().parent
for i in (1, 2, 3):
    b64 = (HERE / f"_b64_part{i}.txt").read_text().strip()
    out = HERE / f"_src_part{i}.py"
    out.write_bytes(base64.b64decode(b64))
    print("wrote", out.name, out.stat().st_size)
print("done")
