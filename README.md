# Resonance Notes

Carepatron-ready note formatter and manual backup generator for
`notes.resonancepsychiatry.com`.

- Works as a manual-first fallback when notes are not available in Mem.
- Supports drafting from Fireflies transcripts **or** pasted manual source text.
- Supports CPT-driven branching (including psychotherapy add-ons and 90792 initial
  eval handling).
- Supports metadata augmentation/editing for existing generated note outputs.

## Setup

- Cloudflare Worker, password-gated (cookie session, 30 days).
- Same logo + signature as labs/transcripts apps.
- Built via `python3 build_worker.py` to inject base64 assets.

## Edit

Edit `src/index.template.js`, then run:

    python3 build_worker.py

`src/index.js` is the deployed file (auto-generated; do not edit directly).
