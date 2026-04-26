// Resonance Notes — Carepatron-ready note formatter
// Paste raw text → adds header, patient info, telehealth statement,
// billing fields, and signature block. Copy or download PDF.

const LOGO_B64 = "__LOGO_B64__";
const SIGNATURE_B64 = "__SIGNATURE_B64__";

const COOKIE_NAME = "rn_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Default telehealth attestation — editable in the form
const DEFAULT_TELEHEALTH =
  "Telehealth visit conducted via secure two-way audio/video. Patient verbally consented to telehealth services. " +
  "Patient identity confirmed by name and date of birth. Patient location verified at the start of session. " +
  "Provider was located in NJ. Confidentiality and limits thereof reviewed. " +
  "There were no technical issues that affected the quality of care.";

// ───────── Auth helpers ─────────
function parseCookies(req) {
  const h = req.headers.get("cookie") || "";
  const out = {};
  for (const part of h.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i)] = decodeURIComponent(part.slice(i + 1));
  }
  return out;
}
function isAuthed(req, env) {
  const c = parseCookies(req);
  return c[COOKIE_NAME] === env.SITE_PASSWORD;
}
function loginRedirect(path) {
  const target = path && path !== "/login" ? "?next=" + encodeURIComponent(path) : "";
  return new Response(null, { status: 302, headers: { Location: "/login" + target } });
}

// ───────── Login page ─────────
function renderLogin(error, next) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sign in — Resonance Notes</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Calibri,'Segoe UI',sans-serif;background:#F4F1F8;color:#28251D;
       min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
  .card{background:#fff;border:1px solid #E5DFEC;border-radius:14px;
        padding:40px 44px;max-width:380px;width:100%;
        box-shadow:0 8px 24px rgba(30,19,66,0.08)}
  .logo{display:block;width:200px;margin:0 auto 24px;opacity:0.95}
  h1{font-family:Georgia,serif;color:#1E1342;font-size:22px;font-weight:600;
     text-align:center;margin-bottom:8px;letter-spacing:0.3px}
  .sub{text-align:center;color:#5C5470;font-size:13px;margin-bottom:24px;
       text-transform:uppercase;letter-spacing:1.2px}
  label{display:block;font-size:11px;color:#5C5470;text-transform:uppercase;
        letter-spacing:0.8px;margin-bottom:6px;font-weight:600}
  input[type=password]{width:100%;padding:12px 14px;border:1.5px solid #D4CDDF;
                       border-radius:8px;font-size:15px;font-family:inherit;
                       background:#FBFAFD;color:#28251D}
  input[type=password]:focus{outline:none;border-color:#4A2D7A;background:#fff}
  button{width:100%;padding:13px;background:#1E1342;color:#fff;border:none;
         border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;
         text-transform:uppercase;letter-spacing:0.8px;margin-top:18px;
         font-family:inherit;transition:background 0.15s}
  button:hover{background:#4A2D7A}
  .err{background:#FBEAF1;border:1px solid #E8C5D6;color:#A12C7B;
       padding:10px 12px;border-radius:6px;font-size:13px;margin-bottom:16px}
</style></head>
<body><div class="card">
  <img class="logo" src="${LOGO_B64}" alt="Resonance Psychiatry">
  <h1>Note Formatter</h1>
  <div class="sub">Sign in</div>
  ${error ? `<div class="err">${error}</div>` : ""}
  <form method="POST" action="/login">
    <input type="hidden" name="next" value="${next || "/"}">
    <label for="password">Password</label>
    <input id="password" name="password" type="password" autofocus required>
    <button type="submit">Sign in</button>
  </form>
</div></body></html>`;
}

// ───────── Main app page ─────────
function renderApp() {
  const today = new Date().toISOString().slice(0, 10);
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Note Formatter — Resonance Psychiatry</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Calibri,'Segoe UI',sans-serif;background:#F4F1F8;color:#28251D;
       min-height:100vh;line-height:1.5}
  .topbar{background:#1E1342;padding:14px 28px;display:flex;
          justify-content:space-between;align-items:center;color:#fff}
  .topbar .brand{display:flex;align-items:center;gap:14px}
  .topbar img{height:32px}
  .topbar .title{font-family:Georgia,serif;font-size:16px;letter-spacing:0.4px}
  .topbar a{color:#9B8CB5;text-decoration:none;font-size:12px;
            text-transform:uppercase;letter-spacing:0.8px;font-weight:600}
  .topbar a:hover{color:#fff}

  .container{max-width:1200px;margin:0 auto;padding:28px;display:grid;
             grid-template-columns:minmax(380px,1fr) minmax(420px,1.2fr);gap:28px}
  @media (max-width:980px){.container{grid-template-columns:1fr}}

  .panel{background:#fff;border:1px solid #E5DFEC;border-radius:12px;
         padding:24px 28px;box-shadow:0 2px 8px rgba(30,19,66,0.04)}
  .panel h2{font-family:Georgia,serif;color:#1E1342;font-size:16px;
            font-weight:600;text-transform:uppercase;letter-spacing:1.2px;
            margin-bottom:18px;padding-bottom:10px;
            border-bottom:1.5px solid #E5DFEC}

  .field{margin-bottom:14px}
  .field.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .field.row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
  label{display:block;font-size:11px;color:#5C5470;text-transform:uppercase;
        letter-spacing:0.8px;margin-bottom:5px;font-weight:600}
  input[type=text],input[type=date],select,textarea{
    width:100%;padding:9px 11px;border:1.5px solid #D4CDDF;border-radius:7px;
    font-size:14px;font-family:inherit;background:#FBFAFD;color:#28251D
  }
  input:focus,select:focus,textarea:focus{outline:none;border-color:#4A2D7A;background:#fff}
  textarea{resize:vertical;min-height:60px;font-family:Calibri,'Segoe UI',sans-serif}
  textarea#noteBody{min-height:280px;font-size:14px;line-height:1.55}

  .btn-row{display:flex;gap:10px;margin-top:8px}
  .btn{padding:11px 20px;border:none;border-radius:8px;font-size:13px;
       font-weight:600;cursor:pointer;text-transform:uppercase;
       letter-spacing:0.6px;font-family:inherit;transition:all 0.15s;flex:1}
  .btn-primary{background:#1E1342;color:#fff}
  .btn-primary:hover{background:#4A2D7A}
  .btn-secondary{background:#fff;color:#1E1342;border:1.5px solid #1E1342}
  .btn-secondary:hover{background:#F4F1F8}
  .btn.copied{background:#437A22 !important;color:#fff !important;border-color:#437A22 !important}

  /* ── Preview pane ── */
  .preview-wrap{position:sticky;top:28px;max-height:calc(100vh - 56px);
                overflow-y:auto;border-radius:12px}
  .preview{background:#fff;padding:48px 56px;font-family:Calibri,'Segoe UI',sans-serif;
           color:#28251D;font-size:13px;line-height:1.55;min-height:600px;
           border:1px solid #E5DFEC;border-radius:12px}
  .preview .letterhead{display:flex;justify-content:space-between;align-items:flex-start;
                       padding-bottom:18px;border-bottom:2px solid #1E1342;margin-bottom:22px}
  .preview .letterhead img{height:54px}
  .preview .letterhead .provider{text-align:right;font-size:11px;color:#5C5470;line-height:1.55}
  .preview .letterhead .provider .name{font-family:Georgia,serif;font-size:13px;
                                       color:#1E1342;font-weight:600;margin-bottom:2px}

  .preview h3{font-family:Georgia,serif;color:#1E1342;font-size:11px;
              font-weight:700;text-transform:uppercase;letter-spacing:1.4px;
              margin-bottom:8px;margin-top:20px}
  .preview h3:first-of-type{margin-top:0}

  .preview .pinfo{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;
                  font-size:13px;margin-bottom:6px}
  .preview .pinfo .lbl{color:#5C5470;font-weight:600}
  .preview .pinfo .val{color:#28251D}

  .preview .telehealth{background:#F4F1F8;border-left:3px solid #4A2D7A;
                       padding:10px 14px;font-size:12px;color:#28251D;
                       border-radius:0 6px 6px 0;line-height:1.5}

  .preview .body{white-space:pre-wrap;font-size:13px;line-height:1.6;color:#28251D}

  .preview .billing{background:#FBFAFD;border:1px solid #E5DFEC;border-radius:8px;
                    padding:14px 18px;font-size:12px}
  .preview .billing .row{display:grid;grid-template-columns:auto 1fr;gap:4px 14px}
  .preview .billing .lbl{color:#5C5470;font-weight:600;text-transform:uppercase;
                         letter-spacing:0.8px;font-size:10px;align-self:center}
  .preview .billing .val{color:#1E1342;font-weight:600;font-size:13px}

  .preview .sig-block{margin-top:32px;padding-top:18px;border-top:1px solid #E5DFEC}
  .preview .sig-block img{height:54px;margin-bottom:4px}
  .preview .sig-block .sig-line{font-family:Georgia,serif;color:#1E1342;
                                font-size:13px;font-weight:600;margin-bottom:1px}
  .preview .sig-block .sig-cred{font-size:11px;color:#5C5470;line-height:1.5}

  .hint{font-size:11px;color:#9B8CB5;font-style:italic;margin-top:4px}
</style>
</head>
<body>

<div class="topbar">
  <div class="brand">
    <img src="${LOGO_B64}" alt="Resonance Psychiatry">
    <span class="title">Note Formatter</span>
  </div>
  <a href="/logout">Sign out</a>
</div>

<div class="container">

  <!-- ── Form panel ── -->
  <div class="panel">
    <h2>Draft from transcript</h2>

    <div class="field row">
      <div>
        <label for="channel">Patient channel</label>
        <select id="channel">
          <option value="">Loading channels…</option>
        </select>
      </div>
      <div>
        <label for="session">Session</label>
        <select id="session" disabled>
          <option value="">Pick a channel first</option>
        </select>
      </div>
    </div>

    <div class="btn-row" style="margin-bottom:8px">
      <button class="btn btn-primary" id="draftBtn" type="button" disabled>Draft note from transcript</button>
    </div>
    <div id="draftStatus" class="hint" style="min-height:18px"></div>

    <h2 style="margin-top:24px">Visit details</h2>

    <div class="field row">
      <div>
        <label for="patientName">Patient name</label>
        <input id="patientName" type="text" placeholder="Last, First">
      </div>
      <div>
        <label for="dos">Date of service</label>
        <input id="dos" type="date" value="${today}">
      </div>
    </div>

    <div class="field" id="teleField">
      <label for="telehealth">Telehealth statement</label>
      <textarea id="telehealth" rows="4">${DEFAULT_TELEHEALTH}</textarea>
    </div>

    <h2 style="margin-top:24px">Note body</h2>
    <div class="field">
      <textarea id="noteBody" placeholder="Paste your note here…"></textarea>
      <div class="hint">Pasted text preserves line breaks. Use blank lines between sections.</div>
    </div>

    <h2 style="margin-top:24px">Billing</h2>

    <div class="field row3">
      <div>
        <label for="cpt">CPT code</label>
        <input id="cpt" type="text" placeholder="99214" list="cpt-options">
        <datalist id="cpt-options">
          <option value="99213">99213 — Established, low</option>
          <option value="99214">99214 — Established, mod</option>
          <option value="99215">99215 — Established, high</option>
          <option value="99204">99204 — New, mod</option>
          <option value="99205">99205 — New, high</option>
          <option value="90792">90792 — Psych eval w/ MM</option>
          <option value="90833">90833 — +Therapy 16-37 min</option>
          <option value="90836">90836 — +Therapy 38-52 min</option>
          <option value="90838">90838 — +Therapy 53+ min</option>
          <option value="90847">90847 — Family therapy</option>
        </datalist>
      </div>
      <div>
        <label for="addon">Add-on (optional)</label>
        <input id="addon" type="text" placeholder="90833" list="cpt-options">
      </div>
      <div>
        <label for="pos">Place of service</label>
        <select id="pos">
          <option value="02 — Telehealth (patient not in home)" data-mode="telehealth">02 — Telehealth</option>
          <option value="10 — Telehealth (patient at home)" data-mode="telehealth" selected>10 — Telehealth (home)</option>
          <option value="11 — Office" data-mode="office">11 — Office (in person)</option>
        </select>
      </div>
    </div>

    <div class="field">
      <label for="icd">ICD-10 diagnoses (comma-separated)</label>
      <input id="icd" type="text" placeholder="F33.1, F41.1">
    </div>

    <div class="field row3">
      <div>
        <label for="startTime">Start</label>
        <input id="startTime" type="time">
      </div>
      <div>
        <label for="stopTime">Stop</label>
        <input id="stopTime" type="time">
      </div>
      <div>
        <label for="totalMin">Total min</label>
        <input id="totalMin" type="text" placeholder="auto" inputmode="numeric">
      </div>
    </div>

    <div class="btn-row">
      <button class="btn btn-primary" id="copyBtn" type="button">Copy text</button>
      <button class="btn btn-secondary" id="pdfBtn" type="button">Download PDF</button>
    </div>
  </div>

  <!-- ── Preview pane ── -->
  <div class="preview-wrap">
    <div class="preview" id="preview">
      <div class="letterhead">
        <img src="${LOGO_B64}" alt="Resonance Psychiatry">
        <div class="provider">
          <div class="name">Jennifer L. Bowen, DNP, PMHNP-BC</div>
          <div>NPI: 1366827404</div>
          <div>Phone: (908) 430-8061 · Fax: (732) 605-5942</div>
        </div>
      </div>

      <h3>Patient</h3>
      <div class="pinfo">
        <div class="lbl">Name</div><div class="val" id="pv-name">—</div>
        <div class="lbl">Date of service</div><div class="val" id="pv-dos">—</div>
      </div>

      <h3 id="pv-tele-h">Telehealth attestation</h3>
      <div class="telehealth" id="pv-telehealth">—</div>

      <h3>Note</h3>
      <div class="body" id="pv-body">(paste note in the field on the left)</div>

      <h3>Billing</h3>
      <div class="billing">
        <div class="row">
          <div class="lbl">CPT</div><div class="val" id="pv-cpt">—</div>
          <div class="lbl">Place of service</div><div class="val" id="pv-pos">—</div>
          <div class="lbl">ICD-10</div><div class="val" id="pv-icd">—</div>
          <div class="lbl">Time</div><div class="val" id="pv-time">—</div>
        </div>
      </div>

      <div class="sig-block">
        <img src="${SIGNATURE_B64}" alt="Signature">
        <div class="sig-line">Jennifer L. Bowen, DNP, PMHNP-BC</div>
        <div class="sig-cred">NPI 1366827404 · Resonance Psychiatry</div>
        <div class="sig-cred" id="pv-signdate">—</div>
      </div>
    </div>
  </div>
</div>

<script>
  // ── Live preview ──
  function fmtDate(iso) {
    if (!iso) return '';
    const [y,m,d] = iso.split('-').map(Number);
    if (!y) return iso;
    return new Date(Date.UTC(y, m-1, d)).toLocaleDateString('en-US',
      { year:'numeric', month:'long', day:'numeric', timeZone:'UTC' });
  }
  function minutesBetween(a, b) {
    if (!a || !b) return null;
    const [ah, am] = a.split(':').map(Number);
    const [bh, bm] = b.split(':').map(Number);
    let mins = (bh * 60 + bm) - (ah * 60 + am);
    if (mins < 0) mins += 24 * 60;
    return mins;
  }
  function $(id) { return document.getElementById(id); }
  function setText(id, val) { const el = $(id); if (el) el.textContent = val || '—'; }

  function update() {
    const name = $('patientName').value.trim();
    const dos = $('dos').value;
    const tele = $('telehealth').value.trim();
    const body = $('noteBody').value;
    const cpt = $('cpt').value.trim();
    const addon = $('addon').value.trim();
    const pos = $('pos').value;
    const posSel = $('pos').selectedOptions[0];
    const posMode = (posSel && posSel.dataset && posSel.dataset.mode) || 'telehealth';
    const icd = $('icd').value.trim();

    // Hide/show telehealth block in form + preview based on POS
    document.getElementById('teleField').style.display = posMode === 'office' ? 'none' : '';
    document.getElementById('pv-tele-h').style.display = posMode === 'office' ? 'none' : '';
    document.getElementById('pv-telehealth').style.display = posMode === 'office' ? 'none' : '';
    const start = $('startTime').value;
    const stop = $('stopTime').value;
    let total = $('totalMin').value.trim();
    if (!total && start && stop) {
      const m = minutesBetween(start, stop);
      if (m != null) total = String(m);
    }

    setText('pv-name', name);
    setText('pv-dos', fmtDate(dos));
    if (posMode !== 'office') setText('pv-telehealth', tele);
    $('pv-body').textContent = body || '(paste note in the field on the left)';

    const cptCombined = addon ? (cpt + ' + ' + addon) : cpt;
    setText('pv-cpt', cptCombined);
    setText('pv-pos', pos);
    setText('pv-icd', icd);

    let timeStr = '';
    if (start && stop) {
      timeStr = start + ' – ' + stop;
      if (total) timeStr += '  (' + total + ' min)';
    } else if (total) {
      timeStr = total + ' min';
    }
    setText('pv-time', timeStr);
    setText('pv-signdate', 'Signed ' + fmtDate(dos || new Date().toISOString().slice(0,10)));
  }

  // Bind all inputs
  ['patientName','dos','telehealth','noteBody','cpt','addon','pos','icd','startTime','stopTime','totalMin']
    .forEach(id => {
      const el = $(id);
      if (el) el.addEventListener('input', update);
      if (el && el.tagName === 'SELECT') el.addEventListener('change', update);
    });

  // ────── Fireflies + AI drafting ──────
  let allSessions = [];

  function setStatus(text, kind) {
    const el = $('draftStatus');
    el.textContent = text || '';
    el.style.color = kind === 'error' ? '#A12C7B' : (kind === 'ok' ? '#437A22' : '#9B8CB5');
  }

  // Convert channel title (e.g. 'GRACE H') to a likely 'Last, First' guess.
  // Channel titles in Fireflies are usually FIRST LAST (sometimes just one word).
  function channelToPatientName(title) {
    if (!title) return '';
    const t = title.trim();
    // Title-case the words
    const tc = s => s.split(/\s+/).map(w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w).join(' ');
    const parts = t.split(/\s+/);
    if (parts.length >= 2) {
      // Last name = last token, first name(s) = everything before
      const last = tc(parts[parts.length - 1]);
      const first = tc(parts.slice(0, -1).join(' '));
      return last + ', ' + first;
    }
    return tc(t);
  }

  function fmtSessionLabel(s) {
    const d = new Date(Number(s.date) || 0);
    const dateStr = d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
    let dur = '';
    if (s.duration) {
      const total = Math.round(Number(s.duration));
      if (total >= 60) {
        const h = Math.floor(total / 60), m = total % 60;
        dur = '  •  ' + h + 'h' + (m ? ' ' + m + 'm' : '');
      } else {
        dur = '  •  ' + total + 'm';
      }
    }
    return dateStr + '  •  ' + timeStr + dur + (s.title ? '  —  ' + s.title : '');
  }

  // Load channels on page open
  (async () => {
    try {
      const r = await fetch('/api/channels');
      if (!r.ok) throw new Error('Failed to load channels');
      const d = await r.json();
      const sel = $('channel');
      sel.innerHTML = '<option value="">Pick a patient channel…</option>';
      const sorted = (d.channels || []).slice().sort((a,b) =>
        (a.title || '').toLowerCase().localeCompare((b.title || '').toLowerCase()));
      for (const c of sorted) {
        const o = document.createElement('option');
        o.value = c.id;
        o.textContent = c.title || '(untitled)';
        sel.appendChild(o);
      }
    } catch (e) {
      $('channel').innerHTML = '<option value="">Could not load channels</option>';
      setStatus('Channels not available: ' + (e.message || e), 'error');
    }
  })();

  // When channel changes, load its sessions
  $('channel').addEventListener('change', async () => {
    const cid = $('channel').value;
    const sessSel = $('session');
    sessSel.disabled = true;
    sessSel.innerHTML = '<option value="">Loading sessions…</option>';
    $('draftBtn').disabled = true;
    if (!cid) {
      sessSel.innerHTML = '<option value="">Pick a channel first</option>';
      return;
    }
    const channelTitle = $('channel').selectedOptions[0].textContent;
    // Pre-fill patient name from channel
    if (!$('patientName').value.trim()) {
      $('patientName').value = channelToPatientName(channelTitle);
      update();
    }
    try {
      const r = await fetch('/api/transcripts', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ channelId: cid, limit: 50 }),
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      allSessions = (d.transcripts || []).slice()
        .sort((a,b) => Number(b.date||0) - Number(a.date||0));
      sessSel.innerHTML = '<option value="">Pick a session…</option>';
      for (const s of allSessions) {
        const o = document.createElement('option');
        o.value = s.id;
        o.textContent = fmtSessionLabel(s);
        sessSel.appendChild(o);
      }
      sessSel.disabled = false;
    } catch (e) {
      sessSel.innerHTML = '<option value="">Failed to load sessions</option>';
      setStatus('Could not load sessions: ' + (e.message || e), 'error');
    }
  });

  // When a session is picked, enable Draft + auto-fill date
  $('session').addEventListener('change', () => {
    const sid = $('session').value;
    $('draftBtn').disabled = !sid;
    if (sid) {
      const s = allSessions.find(x => x.id === sid);
      if (s && s.date) {
        const d = new Date(Number(s.date));
        const iso = d.getFullYear() + '-' +
          String(d.getMonth() + 1).padStart(2, '0') + '-' +
          String(d.getDate()).padStart(2, '0');
        $('dos').value = iso;
        update();
      }
    }
  });

  // Click 'Draft note' — fetch transcript, send to AI, fill noteBody
  $('draftBtn').addEventListener('click', async () => {
    const sid = $('session').value;
    if (!sid) return;
    const btn = $('draftBtn');
    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Drafting… (this takes 15–30 seconds)';
    setStatus('Pulling transcript and drafting note. Hang tight…', '');
    try {
      const r = await fetch('/api/draft', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ id: sid }),
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || ('HTTP ' + r.status));
      }
      const d = await r.json();
      $('noteBody').value = d.note || '';
      update();
      setStatus('Draft ready. Review and edit before copying.', 'ok');
    } catch (e) {
      setStatus('Draft failed: ' + (e.message || e), 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = origText;
    }
  });

  // Auto-fill total min when start/stop change
  ['startTime','stopTime'].forEach(id => {
    $(id).addEventListener('change', () => {
      const m = minutesBetween($('startTime').value, $('stopTime').value);
      if (m != null && !$('totalMin').value.trim()) $('totalMin').value = m;
      update();
    });
  });

  update();

  // ── Build plain-text version for clipboard ──
  function buildPlainText() {
    const name = $('patientName').value.trim() || '[Patient Name]';
    const dos = fmtDate($('dos').value) || '[Date]';
    const tele = $('telehealth').value.trim();
    const body = $('noteBody').value.trim();
    const cpt = $('cpt').value.trim();
    const addon = $('addon').value.trim();
    const pos = $('pos').value;
    const posMode = $('pos').selectedOptions[0].dataset.mode || 'telehealth';
    const icd = $('icd').value.trim();
    const start = $('startTime').value;
    const stop = $('stopTime').value;
    let total = $('totalMin').value.trim();
    if (!total && start && stop) {
      const m = minutesBetween(start, stop);
      if (m != null) total = String(m);
    }

    const lines = [];
    lines.push('PATIENT:           ' + name);
    lines.push('DATE OF SERVICE:   ' + dos);
    lines.push('PROVIDER:          Jennifer L. Bowen, DNP, PMHNP-BC  (NPI 1366827404)');
    lines.push('');
    if (posMode !== 'office') {
      lines.push('TELEHEALTH ATTESTATION');
      lines.push(tele);
      lines.push('');
    }
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('');
    lines.push(body);
    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('BILLING');
    lines.push('  CPT:              ' + (addon ? cpt + ' + ' + addon : cpt));
    lines.push('  Place of service: ' + pos);
    lines.push('  ICD-10:           ' + icd);
    let timeStr = '';
    if (start && stop) {
      timeStr = start + ' – ' + stop + (total ? '  (' + total + ' min)' : '');
    } else if (total) timeStr = total + ' min';
    lines.push('  Time:             ' + timeStr);
    lines.push('');
    lines.push('Electronically signed: Jennifer L. Bowen, DNP, PMHNP-BC');
    lines.push('NPI 1366827404 · Resonance Psychiatry');
    lines.push('Signed ' + dos);

    return lines.join('\\n');
  }

  // Copy to clipboard
  $('copyBtn').addEventListener('click', async () => {
    const btn = $('copyBtn');
    const orig = btn.textContent;
    try {
      await navigator.clipboard.writeText(buildPlainText());
      btn.textContent = '✓ Copied';
      btn.classList.add('copied');
    } catch (e) {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = buildPlainText();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      btn.textContent = '✓ Copied';
      btn.classList.add('copied');
    }
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 2000);
  });

  // Download as PDF — use browser print to PDF
  $('pdfBtn').addEventListener('click', () => {
    const previewHtml = $('preview').outerHTML;
    const styles = Array.from(document.styleSheets)
      .map(ss => { try { return Array.from(ss.cssRules).map(r => r.cssText).join('\\n'); } catch(e) { return ''; } })
      .join('\\n');
    const name = ($('patientName').value.trim() || 'Note').replace(/[^A-Za-z0-9_-]+/g,'_');
    const dos = $('dos').value || new Date().toISOString().slice(0,10);
    const filename = name + '_' + dos;
    const win = window.open('', '_blank');
    win.document.write(\`<!doctype html><html><head>
      <meta charset="utf-8"><title>\${filename}</title>
      <style>\${styles}
        @page { size: letter; margin: 0.5in; }
        body { background: #fff !important; padding: 0 !important; }
        .preview { box-shadow: none !important; border: none !important; padding: 0 !important; max-width: 100% !important; }
        .preview-wrap { position: static !important; max-height: none !important; overflow: visible !important; }
      </style></head><body>\${previewHtml}</body></html>\`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
  });
</script>

</body></html>`;
}

// ───────── Worker entry ─────────
const FIREFLIES_ENDPOINT = "https://api.fireflies.ai/graphql";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

async function fireflies(env, query, variables = {}) {
  const apiKey = env.FIREFLIES_API_KEY;
  if (!apiKey) throw new Error("FIREFLIES_API_KEY not configured");
  const res = await fetch(FIREFLIES_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data.errors) {
    throw new Error("Fireflies error: " + JSON.stringify(data.errors));
  }
  return data.data;
}

async function openaiChat(env, messages, model) {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  const res = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o",
      temperature: 0.2,
      messages,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error("OpenAI error: " + JSON.stringify(data).slice(0, 500));
  }
  return data.choices?.[0]?.message?.content || "";
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    if (pathname === "/health") return new Response("ok");

    // Login GET
    if (pathname === "/login" && method === "GET") {
      if (isAuthed(request, env)) {
        return new Response(null, { status: 302, headers: { Location: "/" } });
      }
      const next = url.searchParams.get("next") || "/";
      return html(renderLogin(null, next));
    }

    // Login POST
    if (pathname === "/login" && method === "POST") {
      const form = await request.formData();
      const password = form.get("password") || "";
      const next = form.get("next") || "/";
      if (password !== env.SITE_PASSWORD) {
        return html(renderLogin("Incorrect password.", next), 401);
      }
      const cookie =
        `${COOKIE_NAME}=${encodeURIComponent(env.SITE_PASSWORD)}; ` +
        `Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
      return new Response(null, {
        status: 302,
        headers: { "Set-Cookie": cookie, Location: next },
      });
    }

    // Logout
    if (pathname === "/logout") {
      const cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
      return new Response(null, {
        status: 302,
        headers: { "Set-Cookie": cookie, Location: "/login" },
      });
    }

    // Everything else requires auth
    if (!isAuthed(request, env)) return loginRedirect(pathname);

    // Main page
    if (pathname === "/" && method === "GET") return html(renderApp());

    // ── API: list Fireflies channels ───────────────────────────────────
    if (pathname === "/api/channels" && method === "GET") {
      try {
        const query = `{ channels { id title is_private } }`;
        const data = await fireflies(env, query);
        return json({ channels: data.channels || [] });
      } catch (e) {
        return json({ error: String(e.message || e) }, 500);
      }
    }

    // ── API: list transcripts in a channel ─────────────────────────────
    if (pathname === "/api/transcripts" && method === "POST") {
      try {
        const body = await request.json().catch(() => ({}));
        const channelId = body.channelId;
        const limit = Math.min(Math.max(parseInt(body.limit, 10) || 50, 1), 200);
        if (!channelId) return json({ error: "channelId required" }, 400);
        const query = `query($channelId: String, $limit: Int) {
          transcripts(channel_id: $channelId, limit: $limit) {
            id title date duration
          }
        }`;
        const data = await fireflies(env, query, { channelId, limit });
        return json({ transcripts: data.transcripts || [] });
      } catch (e) {
        return json({ error: String(e.message || e) }, 500);
      }
    }

    // ── API: draft a psychiatric note from a transcript ────────────────
    if (pathname === "/api/draft" && method === "POST") {
      try {
        const body = await request.json().catch(() => ({}));
        const id = body.id;
        if (!id) return json({ error: "id required" }, 400);
        const tQuery = `query($id: String!) {
          transcript(id: $id) {
            id title date
            sentences { speaker_name text start_time }
          }
        }`;
        const tData = await fireflies(env, tQuery, { id });
        const t = tData.transcript;
        if (!t) return json({ error: "Transcript not found" }, 404);
        const sentences = Array.isArray(t.sentences) ? t.sentences : [];
        // Group consecutive sentences by speaker
        const lines = [];
        let curSpeaker = null;
        let buf = [];
        for (const s of sentences) {
          const sp = s.speaker_name || "Unknown";
          if (sp !== curSpeaker) {
            if (buf.length) lines.push(`${curSpeaker}: ${buf.join(" ")}`);
            curSpeaker = sp;
            buf = [s.text || ""];
          } else {
            buf.push(s.text || "");
          }
        }
        if (buf.length) lines.push(`${curSpeaker}: ${buf.join(" ")}`);
        let transcriptText = lines.join("\n");
        // Cap at ~60k chars to stay within model context comfortably
        const MAX = 60000;
        if (transcriptText.length > MAX) {
          transcriptText = transcriptText.slice(0, MAX) + "\n...[truncated]";
        }
        const system = `You are a psychiatric nurse practitioner's clinical scribe. You draft concise, professional follow-up psychiatric progress notes for a Carepatron EHR based on raw session transcripts. Write in third person, clinical tone. Do not invent facts. If something was not discussed, omit or write "Not discussed." Use the patient's words sparingly in quotes when clinically meaningful.`;
        const user = `Draft a psychiatric progress note from the transcript below. Use this exact section structure with these headers, each on its own line:

Chief Complaint:
Interim History:
Medications Reviewed:
Mental Status Exam:
Assessment:
Plan:
Risk Assessment:

Guidelines:
- Chief Complaint: one sentence in patient's words if available.
- Interim History: 3-6 sentences covering symptoms, sleep, appetite, mood, anxiety, stressors, substance use, side effects since last visit.
- Medications Reviewed: bullet list of any medications discussed with adherence/efficacy/side effects.
- Mental Status Exam: brief paragraph (appearance, behavior, speech, mood, affect, thought process, thought content, perception, cognition, insight, judgment). If not directly observed in transcript, infer reasonably from interaction (e.g., "linear and goal-directed", "euthymic") and note "per video session."
- Assessment: 2-4 sentences with diagnostic impression and clinical reasoning.
- Plan: bullet list — medication changes, follow-up interval, labs, referrals, psychotherapy recommendations, safety planning if applicable.
- Risk Assessment: one sentence on suicidal/homicidal ideation, plan, intent. Default to "Patient denies SI/HI, plan, or intent. No acute safety concerns at this time." unless transcript indicates otherwise.

Do not include a header, patient name, date, signature, or billing block — those are added separately. Output only the note body text. Do not use markdown bold/italic.

TRANSCRIPT:
${transcriptText}`;
        const note = await openaiChat(env, [
          { role: "system", content: system },
          { role: "user", content: user },
        ], "gpt-4o");
        return json({
          note,
          title: t.title || "",
          date: t.date || null,
        });
      } catch (e) {
        return json({ error: String(e.message || e) }, 500);
      }
    }

    return new Response(JSON.stringify({ error: "Not found", path: pathname }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  },
};
