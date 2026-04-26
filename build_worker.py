#!/usr/bin/env python3
"""Build src/index.js by injecting logo + signature base64 into a template."""
from pathlib import Path

logo = Path('/home/user/workspace/logo_full_b64.txt').read_text().strip()
sig = Path('/home/user/workspace/signature_base64.txt').read_text().strip()

template = Path('/home/user/workspace/resonance-notes/src/index.template.js').read_text()
out = template.replace('__LOGO_B64__', logo).replace('__SIGNATURE_B64__', sig)
Path('/home/user/workspace/resonance-notes/src/index.js').write_text(out)
print(f"Wrote src/index.js: {len(out)} chars")
