#!/usr/bin/env python3
"""Build src/index.js by injecting logo + signature base64 into a template."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
TEMPLATE = ROOT / "src" / "index.template.js"
OUT = ROOT / "src" / "index.js"
LOGO_FILE = ROOT / "logo_full_b64.txt"
SIG_FILE = ROOT / "signature_base64.txt"


def _extract_from_existing(var_name: str) -> str:
    if not OUT.exists():
        raise FileNotFoundError(f"{OUT} does not exist and {var_name} asset file is missing")
    src = OUT.read_text()
    m = re.search(rf'const {var_name} = "([^"]*)";', src)
    if not m:
        raise RuntimeError(f"Could not extract {var_name} from existing src/index.js")
    return m.group(1)


def _read_asset(path: Path, fallback_var: str) -> str:
    if path.exists():
        return path.read_text().strip()
    return _extract_from_existing(fallback_var)


logo = _read_asset(LOGO_FILE, "LOGO_B64")
sig = _read_asset(SIG_FILE, "SIGNATURE_B64")

template = TEMPLATE.read_text()
out = template.replace("__LOGO_B64__", logo).replace("__SIGNATURE_B64__", sig)
OUT.write_text(out)
print(f"Wrote {OUT}: {len(out)} chars")
