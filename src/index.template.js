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
  <img class="logo" src="data:image/png;base64,${LOGO_B64}" alt="Resonance Psychiatry">
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
    <img src="data:image/png;base64,${LOGO_B64}" alt="Resonance Psychiatry">
    <span class="title">Note Formatter</span>
  </div>
  <a href="/logout">Sign out</a>
</div>

<div class="container">

  <!-- ── Form panel ── -->
  <div class="panel">
    <h2>Visit details</h2>

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

    <div class="field">
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
          <option value="02 — Telehealth (patient not in home)">02 — Telehealth</option>
          <option value="10 — Telehealth (patient at home)" selected>10 — Telehealth (home)</option>
          <option value="11 — Office">11 — Office</option>
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
        <img src="data:image/png;base64,${LOGO_B64}" alt="Resonance Psychiatry">
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

      <h3>Telehealth attestation</h3>
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
        <img src="data:image/png;base64,${SIGNATURE_B64}" alt="Signature">
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
    const icd = $('icd').value.trim();
    const start = $('startTime').value;
    const stop = $('stopTime').value;
    let total = $('totalMin').value.trim();
    if (!total && start && stop) {
      const m = minutesBetween(start, stop);
      if (m != null) total = String(m);
    }

    setText('pv-name', name);
    setText('pv-dos', fmtDate(dos));
    setText('pv-telehealth', tele);
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
    lines.push('TELEHEALTH ATTESTATION');
    lines.push(tele);
    lines.push('');
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

    return new Response(JSON.stringify({ error: "Not found", path: pathname }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  },
};
