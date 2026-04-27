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

    <div class="field row">
      <div>
        <label for="draftCpt">Psychotherapy CPT</label>
        <select id="draftCpt">
          <option value="90833" selected>90833 (16-37 min)</option>
          <option value="90836">90836 (38-52 min)</option>
          <option value="90838">90838 (53+ min)</option>
          <option value="">None / E&amp;M only</option>
        </select>
      </div>
      <div></div>
    </div>

    <div class="field">
      <label for="contextNotes">Patient context (medications, recent labs, prior visit highlights, allergies, ongoing issues)</label>
      <textarea id="contextNotes" rows="6" placeholder="Paste anything the AI should know going in. Examples:&#10;• Current meds: Prozac 20 mg daily, Lamictal 100 mg BID, Ativan 0.5 mg PRN&#10;• Last labs (1/12/26): vit D 22 (low), TSH WNL, CBC WNL&#10;• Started vitamin D 2000 IU daily — needs recheck if taken consistently&#10;• PMH: HTN (controlled), migraines”"></textarea>
      <div class="hint">This is sent to the AI along with the transcript so the note reflects ongoing context, not just what was discussed today.</div>
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

    <div class="btn-row" style="margin-top:18px;margin-bottom:6px;align-items:center">
      <button class="btn btn-primary" id="saveLibBtn" type="button">Save to library</button>
      <button class="btn btn-secondary" id="openLibBtn" type="button">Saved notes…</button>
      <span id="saveLibStatus" class="hint" style="margin-left:10px"></span>
    </div>
    <div class="hint" style="margin-bottom:10px">Saved encrypted to your private AWS S3 bucket (resonance-notes-prod, KMS-encrypted, BAA-covered).</div>

    <h2 style="margin-top:24px">E/M note (99214)</h2>
    <div class="field">
      <textarea id="noteBody" placeholder="Paste or draft the E/M note here…"></textarea>
      <div class="btn-row" style="margin-top:8px">
        <button class="btn btn-secondary" id="copyEmBtn" type="button">Copy E/M note</button>
      </div>
      <div id="copyEmStatus" class="hint" style="min-height:18px"></div>
    </div>

    <h2 style="margin-top:24px">Therapy note (90833 / 90836 / 90838)</h2>
    <div class="field">
      <textarea id="therapyBody" placeholder="Paste or draft the psychotherapy note here…" style="min-height:220px;font-size:14px;line-height:1.55"></textarea>
      <div class="btn-row" style="margin-top:8px">
        <button class="btn btn-secondary" id="copyTherapyBtn" type="button">Copy therapy note</button>
      </div>
      <div id="copyTherapyStatus" class="hint" style="min-height:18px"></div>
      <div class="hint" style="margin-top:6px">The Draft button fills both boxes. Copy each separately into Carepatron.</div>
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
  ['patientName','dos','telehealth','noteBody','therapyBody','cpt','addon','pos','icd','startTime','stopTime','totalMin']
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
    // Load any saved per-channel context notes (meds, labs, etc.)
    try {
      const saved = localStorage.getItem('rn_ctx_' + cid);
      $('contextNotes').value = saved || '';
    } catch (_) {}
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

  // Auto-save context notes per-channel as the user types
  $('contextNotes').addEventListener('input', () => {
    const cid = $('channel').value;
    if (!cid) return;
    try { localStorage.setItem('rn_ctx_' + cid, $('contextNotes').value); } catch (_) {}
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
        body: JSON.stringify({ id: sid, cpt: $('draftCpt').value, context: $('contextNotes').value || '' }),
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || ('HTTP ' + r.status));
      }
      const d = await r.json();
      $('noteBody').value = d.emNote || '';
      $('therapyBody').value = d.therapyNote || '';
      update();
      setStatus('Draft ready. Review and edit each note before copying.', 'ok');
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

  // Copy E/M note only (just the note body, no letterhead/billing wrapper)
  async function copyToClipboard(text, btn, statusEl) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    const orig = btn.textContent;
    btn.textContent = '✓ Copied';
    btn.classList.add('copied');
    if (statusEl) statusEl.textContent = 'Copied to clipboard. Paste into Carepatron.';
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); if (statusEl) statusEl.textContent = ''; }, 2500);
  }

  $('copyEmBtn').addEventListener('click', () => {
    const txt = $('noteBody').value.trim();
    if (!txt) { $('copyEmStatus').textContent = 'E/M note is empty.'; return; }
    copyToClipboard(txt, $('copyEmBtn'), $('copyEmStatus'));
  });

  // ---------- Save to library (S3) ----------
  let currentSavedKey = null; // if a loaded note from library, points to its S3 key for updates
  $('saveLibBtn').addEventListener('click', async () => {
    const btn = $('saveLibBtn');
    const stat = $('saveLibStatus');
    const channelId = $('channel').value || '';
    const channelTitle = ($('channel').selectedOptions[0] && $('channel').selectedOptions[0].textContent) || '';
    const sessionOpt = $('session').selectedOptions[0];
    const transcriptId = $('session').value || '';
    const transcriptTitle = (sessionOpt && sessionOpt.textContent) || '';
    const payload = {
      channelId,
      channelTitle,
      patientName: $('patientName').value || '',
      visitDate: $('dos').value || new Date().toISOString().slice(0,10),
      cpt: $('draftCpt').value || '',
      emNote: $('noteBody').value || '',
      therapyNote: $('therapyBody').value || '',
      context: $('contextNotes').value || '',
      transcriptId,
      transcriptTitle,
    };
    if (!payload.emNote.trim() && !payload.therapyNote.trim()) {
      stat.textContent = 'Nothing to save — both note bodies are empty.';
      stat.style.color = '#A12C7B';
      return;
    }
    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = currentSavedKey ? 'Updating…' : 'Saving…';
    stat.style.color = '';
    stat.textContent = '';
    try {
      let r;
      if (currentSavedKey) {
        r = await fetch('/api/notes/update', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key: currentSavedKey, ...payload }) });
      } else {
        r = await fetch('/api/notes/save', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      }
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || ('HTTP ' + r.status));
      }
      const d = await r.json();
      if (d.key) currentSavedKey = d.key;
      stat.style.color = '#0E7C66';
      stat.textContent = currentSavedKey ? 'Saved. Future edits will update this record.' : 'Saved.';
    } catch (e) {
      stat.style.color = '#A12C7B';
      stat.textContent = 'Save failed: ' + (e.message || e);
    } finally {
      btn.disabled = false;
      btn.textContent = orig;
    }
  });

  // ---------- Saved notes library panel ----------
  $('openLibBtn').addEventListener('click', async () => { await openLibrary(); });
  async function openLibrary() {
    document.body.appendChild(buildLibraryOverlay());
    await loadLibraryList('');
  }
  function buildLibraryOverlay() {
    const wrap = document.createElement('div');
    wrap.id = 'libOverlay';
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(15,18,30,0.55);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:40px 20px;overflow-y:auto';
    wrap.innerHTML = [
      '<div style="background:#fff;max-width:1000px;width:100%;border-radius:14px;padding:24px 28px;box-shadow:0 24px 80px rgba(0,0,0,0.25)">',
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">',
      '<h2 style="margin:0;font-size:20px">Saved notes library</h2>',
      '<button id="libCloseBtn" class="btn btn-secondary" type="button">Close</button>',
      '</div>',
      '<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">',
      '<select id="libChannelFilter" style="flex:1;min-width:200px;padding:8px;border:1px solid #d4d7e0;border-radius:8px"><option value="">All patients</option></select>',
      '<input id="libSearch" type="search" placeholder="Search note text…" style="flex:2;min-width:240px;padding:8px;border:1px solid #d4d7e0;border-radius:8px">',
      '<button id="libRefreshBtn" class="btn btn-secondary" type="button">Refresh</button>',
      '</div>',
      '<div id="libList" style="min-height:200px">Loading…</div>',
      '</div>'
    ].join('');
    wrap.addEventListener('click', (e) => { if (e.target === wrap) wrap.remove(); });
    setTimeout(() => {
      const close = document.getElementById('libCloseBtn');
      if (close) close.addEventListener('click', () => wrap.remove());
      const refresh = document.getElementById('libRefreshBtn');
      if (refresh) refresh.addEventListener('click', () => loadLibraryList(document.getElementById('libChannelFilter').value));
      const filter = document.getElementById('libChannelFilter');
      if (filter) {
        // Populate from current channel dropdown
        const ch = $('channel');
        for (const opt of ch.options) {
          if (!opt.value) continue;
          const o = document.createElement('option');
          o.value = opt.value; o.textContent = opt.textContent;
          filter.appendChild(o);
        }
        filter.addEventListener('change', () => loadLibraryList(filter.value));
      }
      const search = document.getElementById('libSearch');
      if (search) search.addEventListener('input', () => filterLibraryDisplay(search.value));
    }, 0);
    return wrap;
  }
  let libCache = [];
  async function loadLibraryList(channelId) {
    const list = document.getElementById('libList');
    list.textContent = 'Loading…';
    try {
      const q = channelId ? ('?channelId=' + encodeURIComponent(channelId)) : '';
      const r = await fetch('/api/notes/list' + q);
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json();
      libCache = d.notes || [];
      renderLibrary(libCache);
    } catch (e) {
      list.innerHTML = '<div style="color:#A12C7B">Failed to load: ' + escapeHtml(String(e.message || e)) + '</div>';
    }
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function renderLibrary(items) {
    const list = document.getElementById('libList');
    if (!items || items.length === 0) {
      list.innerHTML = '<div class="hint">No saved notes yet. Generate a draft and click "Save to library".</div>';
      return;
    }
    list.innerHTML = items.map((n) => {
      const dt = new Date(n.lastModified).toLocaleString();
      const tag = (n.cpt || 'E/M only');
      const k = escapeHtml(n.key);
      return '<div class="libItem" data-key="' + k + '" style="border:1px solid #e3e6ef;border-radius:10px;padding:12px 14px;margin-bottom:10px;cursor:pointer;background:#fff">' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap">' +
        '<div style="font-weight:600">' + escapeHtml(n.patientName || n.channelTitle || 'Unknown patient') + ' — ' + escapeHtml(n.visitDate || '') + '</div>' +
        '<div class="hint" style="font-size:12px">' + escapeHtml(tag) + ' • ' + escapeHtml(dt) + '</div>' +
        '</div>' +
        '<div class="hint" style="margin-top:4px;font-size:13px">' + escapeHtml(n.transcriptTitle || '') + '</div>' +
        '<div style="margin-top:6px;font-size:13px;color:#444;max-height:54px;overflow:hidden">' + escapeHtml(n.preview || '') + '…</div>' +
        '<div class="btn-row" style="margin-top:8px">' +
        '<button class="btn btn-secondary libLoadBtn" type="button" data-key="' + k + '">Load</button>' +
        '<button class="btn btn-secondary libDelBtn" type="button" data-key="' + k + '" style="color:#A12C7B">Delete</button>' +
        '</div>' +
        '</div>';
    }).join('');
    list.querySelectorAll('.libLoadBtn').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); loadNoteFromLibrary(b.dataset.key); }));
    list.querySelectorAll('.libDelBtn').forEach((b) => b.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Delete this saved note? This cannot be undone.')) return;
      try {
        const r = await fetch('/api/notes/delete', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key: b.dataset.key }) });
        if (!r.ok) throw new Error(await r.text());
        await loadLibraryList(document.getElementById('libChannelFilter').value);
      } catch (err) { alert('Delete failed: ' + (err.message || err)); }
    }));
  }
  function filterLibraryDisplay(q) {
    if (!q) return renderLibrary(libCache);
    const ql = q.toLowerCase();
    renderLibrary(libCache.filter((n) => (
      (n.patientName || '').toLowerCase().includes(ql) ||
      (n.channelTitle || '').toLowerCase().includes(ql) ||
      (n.preview || '').toLowerCase().includes(ql) ||
      (n.transcriptTitle || '').toLowerCase().includes(ql) ||
      (n.visitDate || '').toLowerCase().includes(ql)
    )));
  }
  async function loadNoteFromLibrary(key) {
    try {
      const r = await fetch('/api/notes/get?key=' + encodeURIComponent(key));
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json();
      $('noteBody').value = d.emNote || '';
      $('therapyBody').value = d.therapyNote || '';
      $('contextNotes').value = d.context || '';
      $('patientName').value = d.patientName || '';
      $('dos').value = d.visitDate || '';
      if (d.cpt) $('draftCpt').value = d.cpt;
      currentSavedKey = key;
      $('saveLibStatus').style.color = '#0E7C66';
      $('saveLibStatus').textContent = 'Loaded. Edits will update this saved note.';
      const ov = document.getElementById('libOverlay');
      if (ov) ov.remove();
      update();
    } catch (e) {
      alert('Load failed: ' + (e.message || e));
    }
  }
  // Reset "current saved key" tracking whenever a fresh draft is generated
  $('draftBtn').addEventListener('click', () => { currentSavedKey = null; });

  $('copyTherapyBtn').addEventListener('click', () => {
    const txt = $('therapyBody').value.trim();
    if (!txt) { $('copyTherapyStatus').textContent = 'Therapy note is empty.'; return; }
    copyToClipboard(txt, $('copyTherapyBtn'), $('copyTherapyStatus'));
  });

  // Copy full formatted note (letterhead + billing block) — legacy bottom button
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
      max_tokens: 8000,
      messages,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error("OpenAI error: " + JSON.stringify(data).slice(0, 500));
  }
  return data.choices?.[0]?.message?.content || "";
}

// ----- AWS SigV4 helpers (S3) -----
async function sha256Hex(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function hmac(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", typeof key === "string" ? new TextEncoder().encode(key) : key,
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data)));
}
async function hmacHex(key, data) {
  const sig = await hmac(key, data);
  return [...sig].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function awsDateStamp(d) {
  const iso = d.toISOString().replace(/[-:]/g, "").replace(/\..*/, "") + "Z";
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}
function awsUriEncode(s, encodeSlash = true) {
  return s.split("").map((c) => {
    if (/[A-Za-z0-9_.~-]/.test(c)) return c;
    if (c === "/" && !encodeSlash) return c;
    return "%" + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
  }).join("");
}
// Sign and execute an S3 request. method: GET|PUT|DELETE; key: object key (no leading slash); body: string|Uint8Array|undefined; query: {param:value} for listing; headers: extra headers map
async function s3Request(env, method, key, body = "", query = {}, extraHeaders = {}) {
  const region = env.AWS_REGION || "us-east-1";
  const bucket = env.S3_BUCKET;
  const accessKey = env.AWS_ACCESS_KEY_ID;
  const secretKey = env.AWS_SECRET_ACCESS_KEY;
  if (!bucket || !accessKey || !secretKey) {
    throw new Error("AWS credentials not configured (set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET as worker secrets)");
  }
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const now = new Date();
  const { amzDate, dateStamp } = awsDateStamp(now);
  const bodyBytes = typeof body === "string" ? new TextEncoder().encode(body) : (body || new Uint8Array());
  const payloadHash = await sha256Hex(typeof body === "string" ? body : new TextDecoder().decode(bodyBytes));
  const canonicalUri = "/" + awsUriEncode(key, false);
  const canonicalQuery = Object.keys(query).sort().map(
    (k) => awsUriEncode(k) + "=" + awsUriEncode(String(query[k]))
  ).join("&");
  const headers = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...extraHeaders,
  };
  if (method === "PUT" && !headers["content-type"]) headers["content-type"] = "application/json";
  const sortedHeaderKeys = Object.keys(headers).map((k) => k.toLowerCase()).sort();
  const canonicalHeaders = sortedHeaderKeys.map((k) => `${k}:${String(headers[Object.keys(headers).find((h) => h.toLowerCase() === k)]).trim()}\n`).join("");
  const signedHeaders = sortedHeaderKeys.join(";");
  const canonicalRequest = [method, canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credScope, await sha256Hex(canonicalRequest)].join("\n");
  const kDate = await hmac("AWS4" + secretKey, dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, "s3");
  const kSigning = await hmac(kService, "aws4_request");
  const signature = await hmacHex(kSigning, stringToSign);
  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const url = `https://${host}${canonicalUri}${canonicalQuery ? "?" + canonicalQuery : ""}`;
  const fetchHeaders = { ...headers, Authorization: authHeader };
  const res = await fetch(url, {
    method,
    headers: fetchHeaders,
    body: method === "GET" || method === "DELETE" || method === "HEAD" ? undefined : bodyBytes,
  });
  return res;
}
async function s3PutJson(env, key, obj) {
  const res = await s3Request(env, "PUT", key, JSON.stringify(obj));
  if (!res.ok) throw new Error(`S3 PUT failed: ${res.status} ${await res.text()}`);
  return true;
}
async function s3GetJson(env, key) {
  const res = await s3Request(env, "GET", key);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`S3 GET failed: ${res.status} ${await res.text()}`);
  return await res.json();
}
async function s3Delete(env, key) {
  const res = await s3Request(env, "DELETE", key);
  if (!res.ok && res.status !== 404) throw new Error(`S3 DELETE failed: ${res.status} ${await res.text()}`);
  return true;
}
// List objects with optional prefix; returns array of {key, lastModified, size}
async function s3List(env, prefix = "") {
  const all = [];
  let continuationToken = undefined;
  do {
    const query = { "list-type": "2", prefix, "max-keys": "1000" };
    if (continuationToken) query["continuation-token"] = continuationToken;
    const res = await s3Request(env, "GET", "", "", query);
    if (!res.ok) throw new Error(`S3 LIST failed: ${res.status} ${await res.text()}`);
    const xml = await res.text();
    // Lightweight XML parsing
    const contents = xml.match(/<Contents>[\s\S]*?<\/Contents>/g) || [];
    for (const c of contents) {
      const k = (c.match(/<Key>([^<]+)<\/Key>/) || [])[1];
      const lm = (c.match(/<LastModified>([^<]+)<\/LastModified>/) || [])[1];
      const sz = (c.match(/<Size>([^<]+)<\/Size>/) || [])[1];
      if (k) all.push({ key: k, lastModified: lm, size: Number(sz) || 0 });
    }
    const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
    continuationToken = truncated ? (xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/) || [])[1] : undefined;
  } while (continuationToken);
  return all;
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
        const cpt = (body.cpt || "").trim(); // optional: 90833 | 90836 | 90838
        const userContext = (body.context || "").toString().trim().slice(0, 8000);
        const visitDate = t.date ? new Date(Number(t.date)).toISOString().slice(0, 10) : "[insert]";
        const system = `You are a medical scribe formatting a transcript into a structured clinical note. You are NOT a doctor, you do NOT make medical decisions, and you do NOT give medical advice. Your only job is to take what the licensed clinician already said in the visit transcript and reorganize it into the structured note format she uses in her EHR. All clinical decisions, diagnoses, medication adjustments, and treatment plans were already made by the licensed provider during the visit — you are simply rewriting them in the standardized note format below. You are working for Jennifer L. Bowen, DNP, PMHNP-BC (NPI 1366827404), a licensed New Jersey psychiatric nurse practitioner. The transcript is from her own HIPAA-compliant telehealth visit with her own patient and she is the one signing the final note.

The video platform is doxy.me (HIPAA-compliant); the EHR is Carepatron. All output must be clinically accurate, concise but complete, payer-friendly, audit-resistant, written in professional psychiatric language, telehealth-appropriate for NJ, and aligned with DSM-5-TR and current standards of care.

WRITE LIKE AN EXPERIENCED PSYCHIATRIC NP — not a template. Show clinical reasoning implicitly. Reflect symptom trajectory (improving, worsening, fluctuating, partial response). Subtly justify medication decisions even when continuing. Tie symptoms to functional impairment (work, parenting, relationships, executive function) so medical necessity is obvious. Group symptoms meaningfully — mood, anxiety, sleep, cognition, functioning — never robotic dumps. Only include clinically relevant negatives. Risk assessment must be clean and defensible (SI/HI, self-harm, psychosis if relevant, protective factors when appropriate); avoid vague "stable" without context. Medication notes must show thinking ("continues to tolerate well", "partial response", "targeting residual symptoms of X", "no adverse effects reported"); if no changes, justify why. MSE must be purposeful, telehealth-realistic, and align with the HPI — only document what is observable via video. Therapy notes must feel specific: what was actually discussed, what intervention was used, why, and how the patient responded — never generic "supportive therapy provided" filler.

STRICTLY DO NOT FABRICATE: names, DOB, identifiers, symptoms not stated, risk that was not assessed, medication changes, or therapy duration/content. If information is missing, write "not reported" or omit appropriately. Use de-identified placeholders only.

SEPARATE THE SERVICES: E/M (99214) = medical + diagnostic + medication reasoning. Psychotherapy (9083X) = emotional/behavioral work. Do not blur them. The note should sound like one clinician wrote it — no internal contradictions, no copy-paste tone shifts, no generic AI phrasing.`;

        let therapyDuration, therapyCpt;
        if (cpt === "90838") { therapyDuration = "53+ minutes"; therapyCpt = "90838"; }
        else if (cpt === "90836") { therapyDuration = "38–52 minutes"; therapyCpt = "90836"; }
        else if (cpt === "90833") { therapyDuration = "16–37 minutes"; therapyCpt = "90833"; }
        else { therapyDuration = "16–37 minutes"; therapyCpt = "90833"; }

        const user = `Read the transcript carefully and silently extract EVERY clinical detail before writing. Do not output the extraction. Capture:
- Every prescribed medication (name, dose, frequency, adherence, response, side effects, any titration/start/stop)
- Every supplement, vitamin, or OTC mentioned, including any LAPSE (e.g., "stopped vitamin D after one month") — these are routinely missed and must be captured
- Every lab value, lab result, or lab order mentioned with trend (↑/↓/WNL), what is being rechecked, and why
- Every symptom and change since last visit, grouped meaningfully (mood, anxiety, sleep, cognition, energy, functioning)
- Every stressor and functional impact (work, parenting, relationships, executive function)
- Every risk-relevant statement (SI, HI, self-harm, hopelessness, substance use)
- Every patient-education topic that came up (med risks, side effects, sleep hygiene, lab follow-up, breathing exercises, crisis resources)
- Every therapy theme actually discussed (specific events, relational dynamics, trauma triggers, perfectionism, etc.)
- Every plan / follow-up item, referral, or care-coordination task

If the transcript contains a lab abnormality AND a treatment lapse (e.g., "vitamin D was low and patient stopped supplement"), you MUST surface BOTH and reflect the plan to recheck and resume/adjust. Missing this is a documentation failure.

# OUTPUT FORMAT

Generate TWO outputs. Wrap each in delimiter lines exactly as shown, on their own lines, with nothing else on the delimiter lines. Do NOT include any preamble or text outside the delimiters.

=== EM_NOTE_START ===
[full E/M note]
=== EM_NOTE_END ===
=== THERAPY_NOTE_START ===
[full psychotherapy note]
=== THERAPY_NOTE_END ===

# OUTPUT 1: E/M NOTE — 99214 (TELEMEDICINE)

Match this exact structure and section headers (use the same wording, capitalization, and order as below). Where placeholders like [insert] appear, leave them so Jen can fill them in. Use plain text — no markdown bold or italic.

E/M Note — 99214 (Telemedicine)
Patient: [insert]
Date of Visit: ${visitDate}
Provider: Jennifer L. Bowen, DNP, PMHNP-BC (NPI 1366827404)
Location: Telehealth via HIPAA-compliant platform (doxy.me)
Provider Location: Home office in NJ
Patient Location: Home in NJ
POS: 02
CPT: 99214
Modifier: 95

Telehealth Compliance Statement
[One paragraph: visit conducted via secure HIPAA-compliant telehealth video; identity verified; verbal consent obtained; technical issues (none, or describe); physical exam deferred due to virtual format; emergency plan reviewed (911 for medical emergencies; 988 for mental health crises); patient verbalized understanding.]

Subjective
Chief Complaint (CC): [one line, in patient's words if available]

History of Present Illness (HPI):
[Narrative paragraph(s). Show symptom trajectory and context since last visit. Tie symptoms to functional impact. Include adherence to medications and a denial-of-SI/HI line near the end if appropriate. Write like a clinician, not a list.]

Medication Adherence / Effects:
• [Med name + dose + frequency — adherence, tolerability, response, rationale. One bullet per medication.]
• [If a dose change is happening this visit: name it and state the plan, e.g., "Plan: Increase Prozac to 40 mg daily; monitor 2–3 weeks."]

Supplements / OTC (include only if any are mentioned):
• [Each supplement with adherence and any lapse, e.g., "Vitamin D — patient stopped supplement after one month; not currently taking."]

Review of Systems (Abbreviated):
• Psychiatric: [findings]
• Neurologic: [findings or denies]
• Cardiovascular: [findings or denies]
• Constitutional: [findings or denies]
• GI/Endocrine: [findings or denies]

Relevant Psychosocial Updates:
[Narrative or bullets describing stressors and functional impact — work, family, relationships, finances, caregiving.]

Objective
Mental Status Exam (MSE):
Appearance: [...]
Behavior: [...]
Speech: [...]
Mood: "[patient's words]"
Affect: [...]
Thought Process: [...]
Thought Content: No SI/HI, no psychosis [or describe findings]
Cognition: Alert and oriented ×4
Insight/Judgment: [...]
Telehealth-specific observation: [stable connection, engagement, etc.]

Labs/Studies: [Each lab with value, arrow (↑/↓/WNL), and reference range if available, OR "None reviewed today" / "Pending". Always surface abnormalities discussed in the transcript with what's being rechecked.]

Risk Assessment
• Acute risk: [Low/Moderate/High] — [SI/HI status, intent/plan/means]
• Chronic/static factors: [history]
• Protective factors: [from transcript: insight, engagement in care, support system, employment, pets, etc.]
• Access to lethal means: [discussed/not discussed; concerns]
• Plan: Continue routine risk monitoring; safety plan reviewed (911/988).

Current Functioning
[1–3 sentences on day-to-day functioning, work, relationships.]

Medication Review
• [Each med — continue/change with rationale, tolerability, monitoring]
• Education: [what was reinforced]
• Monitoring: [what to watch for]

Assessment / Diagnoses (DSM-5-TR / ICD-10-CM)
1. [Code — Diagnosis name (qualifier if relevant, e.g., "recurrent, moderate")]
2. [Code — Diagnosis]
3. [Z-codes for psychosocial/occupational stressors as appropriate, e.g., Z56.9 — Occupational stress]
[Include relevant medical comorbidities being co-managed, e.g., E55.9 — Vitamin D deficiency]

Rationale: [1–3 sentences of clinical reasoning explaining the picture today.]

Plan
1) [Top-level category — e.g., Medication Management]
   • [Specific action with med name + dose + change/continue + rationale]
   • [Monitoring]
2) [Top-level category — e.g., Diagnostics / Care Coordination]
   • [Lab orders, referrals, follow-ups with other providers]
3) [Top-level category — e.g., Patient Education / Lifestyle]
   • [Specific topics discussed: breathing techniques, sleep, hydration, etc.]
4) [Top-level category — e.g., Therapy Integration]
   • [Therapy modality, referrals, focus areas]
5) Follow-Up
   • [Specific interval, e.g., "2 weeks" or "2–3 weeks or sooner if symptoms worsen"]
   • Continue supportive therapy and medication monitoring.
   • Emergency plan reviewed (911/988).

Patient Understanding & Agreement
Patient verbalized understanding of plan, follow-up, and safety measures.

Medical Decision Making (MDM) — Moderate Complexity (99214)
• Problems: [number/complexity of problems addressed today — chronic conditions, exacerbations, new issues]
• Data: [labs reviewed, labs ordered, prior records, coordination with outside providers]
• Risk: [prescription drug management, diagnostic coordination, untreated symptom risk]

CPT Code Justification
• 99214: [Moderate MDM; chronic illness with exacerbation; medication management; diagnostic coordination; risk counseling via telehealth.]
${cpt ? `• ${cpt}: [Psychotherapy ${therapyDuration}, see separate note.]
` : ''}
Action Items
• [Specific tasks for Jen or staff: send order, verify referral, confirm scheduling, etc.]

Condensed, Insurance-Friendly Treatment Plan
• Problem/Goal: [overall framing]
• Objectives (4–6 weeks):
   • [Measurable objective 1]
   • [Measurable objective 2]
   • [Measurable objective 3]
• Interventions: [Medication management, psychoeducation, stress-management strategies, therapy, care coordination as applicable]
• Outcome Measures: [Self-rated improvement, adherence verified, functional milestones]
• Follow-up: [interval] (telehealth). Safety plan reviewed (911/988).

Provider: Jennifer L. Bowen, DNP, PMHNP-BC
State of Practice: New Jersey (Telepsychiatry)

INTERNAL CHECK before outputting Output 1:
- Every supplement, lab, dose change, and treatment lapse from the transcript captured?
- Plan has numbered top-level categories with sub-bullets?
- Patient Education is specific and tied to what was actually discussed?
- Risk Assessment has all 5 sub-bullets present?
- MDM has Problems / Data / Risk explicitly?
If any answer is no, fix before outputting.

# OUTPUT 2: PSYCHOTHERAPY NOTE — ${therapyCpt}

Match this exact structure. Plain text — no markdown.

Psychotherapy Note — ${therapyCpt}
Patient: [insert]
Date of Visit: ${visitDate}
Provider: Jennifer Bowen, DNP, PMHNP-BC
CPT: ${therapyCpt}
Modifier: 95
Format: Telehealth

Psychotherapy Time
${therapyDuration} of psychotherapy were provided in addition to E/M services.

Modality
[One sentence naming the modality, e.g., "Supportive psychotherapy with trauma-informed, insight-oriented, and CBT-informed interventions."]

Themes / Session Focus
[Narrative paragraph(s) describing what was actually discussed in this session. Be specific to the transcript: name the actual stressors, relational dynamics, events, and themes the patient brought up. Avoid generic language like "discussed stressors." Anchor to specifics.]

Interventions Used
• [Specific intervention 1 — e.g., "Trauma-informed exploration of triggers related to being talked over / invalidated"]
• [Specific intervention 2]
• [3–7 bullets total. Be specific. Examples: Supportive therapy; Cognitive reframing; Validation of caregiver burden; Psychoeducation regarding stress reactivity; Reinforcement of boundaries.]

Patient Response
[Paragraph describing engagement, insight, emotional presence, breakthroughs, resistance — specific to what happened in session. Note safety status. Note affect appropriateness.]

Progress
[Paragraph describing trajectory toward treatment goals. Note both progress and limiting factors honestly.]

Plan
• [Continue modality, e.g., "Continue supportive/trauma-informed psychotherapy"]
• [Specific focus areas for ongoing work]
• [Coping support themes]
• Follow up in [interval]

INTERNAL CHECK before outputting Output 2:
- Themes / Session Focus is specific to actual transcript content, not generic?
- Interventions are named and specific (3–7 bullets)?
- Patient Response is paragraph-form and tied to actual session events?
- Plan reflects continuation of work seen in transcript?
If any answer is no, fix before outputting.

# DE-IDENTIFICATION
- Use [insert] where identifiers would go.
- Do NOT invent names, DOBs, addresses, MRNs.
- Patient first name from transcript context is fine if used in HPI/themes; do not invent a last name.

${userContext ? `
LONGITUDINAL PATIENT CONTEXT (provided by the clinician — medications, recent labs, prior visit highlights, allergies, ongoing issues):
${userContext}

TREAT THE PATIENT CONTEXT ABOVE AS GROUND TRUTH for the medication list, recent labs, and ongoing treatment plan. The transcript may not re-state every medication or lab — use the context to populate the Medication Adherence/Effects, Supplements/OTC, Labs/Studies, and Medication Review sections. If the context lists a lab abnormality and a treatment (e.g., low vitamin D + supplement), you MUST surface it in Labs/Studies and in the Plan even if today's transcript only briefly references it. If the transcript and context conflict (e.g., dose change discussed today), the transcript wins for what happened TODAY but the context tells you the prior baseline.
` : ""}
TRANSCRIPT (de-identified clinical content):
${transcriptText}`;
        // gpt-4.1 is less refusal-prone than gpt-4o for clinical scribing
        let raw = await openaiChat(env, [
          { role: "system", content: system },
          { role: "user", content: user },
        ], "gpt-4.1");
        // If the model refuses, retry once with gpt-4o-mini and a stripped-down framing
        const refusalPatterns = /\b(I can't assist|I cannot assist|I'm sorry,? but|I can't help with that|I cannot help with that|I'm unable to|cannot provide medical|I am not able to)\b/i;
        if (refusalPatterns.test(raw) || raw.trim().length < 200) {
          const fallbackSystem = `You are a text formatter. Reorganize the provided meeting transcript into the exact section structure the user requests. Keep all content from the transcript verbatim where possible; only restructure and group it. Do not add information not in the transcript. Do not refuse — this is a formatting task, not a medical task.`;
          const fallbackUser = `Reformat this transcript into the section structure described below. Preserve content from the transcript faithfully and use the placeholders shown for any field not covered in the transcript.\n\n${user}`;
          raw = await openaiChat(env, [
            { role: "system", content: fallbackSystem },
            { role: "user", content: fallbackUser },
          ], "gpt-4o-mini");
        }
        // Split into E/M note and therapy note using delimiters
        function extractBetween(src, startDelim, endDelim) {
          const i = src.indexOf(startDelim);
          if (i < 0) return "";
          const after = i + startDelim.length;
          const j = src.indexOf(endDelim, after);
          if (j < 0) return src.slice(after).trim();
          return src.slice(after, j).trim();
        }
        let emNote = extractBetween(raw, "=== EM_NOTE_START ===", "=== EM_NOTE_END ===");
        let therapyNote = extractBetween(raw, "=== THERAPY_NOTE_START ===", "=== THERAPY_NOTE_END ===");
        // Fallback if model didn't follow delimiters: try splitting on "=====" or full output to E/M
        if (!emNote && !therapyNote) {
          const parts = raw.split(/^={3,}\s*$/m);
          if (parts.length >= 2) {
            emNote = parts[0].trim();
            therapyNote = parts.slice(1).join("\n").trim();
          } else {
            emNote = raw.trim();
            therapyNote = "";
          }
        }
        return json({
          emNote,
          therapyNote,
          title: t.title || "",
          date: t.date || null,
        });
      } catch (e) {
        return json({ error: String(e.message || e) }, 500);
      }
    }

    // ---------- Notes library (S3-backed) ----------
    // Save: POST /api/notes/save  body: { channelId, channelTitle, patientName, visitDate, cpt, emNote, therapyNote, context, transcriptId, transcriptTitle, sessionDateMs }
    if (pathname === "/api/notes/save" && method === "POST") {
      try {
        const b = await request.json();
        const channelId = (b.channelId || "").toString().trim() || "unknown";
        const visitDate = (b.visitDate || new Date().toISOString().slice(0, 10)).toString().slice(0, 10);
        const ts = Date.now();
        const key = `notes/${channelId}/${visitDate}-${ts}.json`;
        const record = {
          version: 1,
          savedAt: new Date().toISOString(),
          channelId,
          channelTitle: b.channelTitle || "",
          patientName: b.patientName || "",
          visitDate,
          cpt: b.cpt || "",
          emNote: b.emNote || "",
          therapyNote: b.therapyNote || "",
          context: b.context || "",
          transcriptId: b.transcriptId || "",
          transcriptTitle: b.transcriptTitle || "",
          sessionDateMs: b.sessionDateMs || null,
          notes: b.notes || "",
        };
        await s3PutJson(env, key, record);
        return json({ ok: true, key });
      } catch (e) {
        return json({ error: String(e.message || e) }, 500);
      }
    }
    // Update existing note: POST /api/notes/update body: { key, ...fields }
    if (pathname === "/api/notes/update" && method === "POST") {
      try {
        const b = await request.json();
        const key = (b.key || "").toString();
        if (!key.startsWith("notes/")) return json({ error: "invalid key" }, 400);
        const existing = await s3GetJson(env, key);
        if (!existing) return json({ error: "not found" }, 404);
        const merged = { ...existing };
        for (const f of ["emNote", "therapyNote", "context", "patientName", "visitDate", "cpt", "notes"]) {
          if (f in b) merged[f] = b[f];
        }
        merged.updatedAt = new Date().toISOString();
        await s3PutJson(env, key, merged);
        return json({ ok: true, key });
      } catch (e) {
        return json({ error: String(e.message || e) }, 500);
      }
    }
    // List: GET /api/notes/list?channelId=... (channelId optional; if omitted, all notes)
    if (pathname === "/api/notes/list" && method === "GET") {
      try {
        const channelId = (url.searchParams.get("channelId") || "").trim();
        const prefix = channelId ? `notes/${channelId}/` : "notes/";
        const objs = await s3List(env, prefix);
        // Pull metadata in parallel (limit to most recent 200)
        const sorted = objs
          .filter((o) => o.key.endsWith(".json"))
          .sort((a, b) => (a.lastModified < b.lastModified ? 1 : -1))
          .slice(0, 200);
        const items = await Promise.all(
          sorted.map(async (o) => {
            try {
              const rec = await s3GetJson(env, o.key);
              if (!rec) return null;
              return {
                key: o.key,
                lastModified: o.lastModified,
                channelId: rec.channelId,
                channelTitle: rec.channelTitle,
                patientName: rec.patientName,
                visitDate: rec.visitDate,
                cpt: rec.cpt,
                transcriptTitle: rec.transcriptTitle,
                hasEm: !!(rec.emNote && rec.emNote.length),
                hasTherapy: !!(rec.therapyNote && rec.therapyNote.length),
                preview: ((rec.emNote || rec.therapyNote || "").slice(0, 240)),
              };
            } catch (_) { return null; }
          })
        );
        return json({ notes: items.filter(Boolean) });
      } catch (e) {
        return json({ error: String(e.message || e) }, 500);
      }
    }
    // Get full note: GET /api/notes/get?key=notes/...
    if (pathname === "/api/notes/get" && method === "GET") {
      try {
        const key = (url.searchParams.get("key") || "").trim();
        if (!key.startsWith("notes/")) return json({ error: "invalid key" }, 400);
        const rec = await s3GetJson(env, key);
        if (!rec) return json({ error: "not found" }, 404);
        return json(rec);
      } catch (e) {
        return json({ error: String(e.message || e) }, 500);
      }
    }
    // Delete: POST /api/notes/delete body: { key }
    if (pathname === "/api/notes/delete" && method === "POST") {
      try {
        const b = await request.json();
        const key = (b.key || "").toString();
        if (!key.startsWith("notes/")) return json({ error: "invalid key" }, 400);
        await s3Delete(env, key);
        return json({ ok: true });
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
