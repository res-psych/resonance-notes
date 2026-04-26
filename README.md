# Resonance Notes

Carepatron-ready note formatter. Paste a raw note → adds header, patient info,
telehealth statement, billing fields, and signature → copy text or download PDF.

## Setup

- Cloudflare Worker, password-gated (cookie session, 30 days).
- Same logo + signature as labs/transcripts apps.
- Built via `python3 build_worker.py` to inject base64 assets.

## Edit

Edit `src/index.template.js`, then run:

    python3 build_worker.py

`src/index.js` is the deployed file (auto-generated; do not edit directly).
