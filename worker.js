// Serves the static site, handles lead form submissions, and injects one
// Meta Pixel into every HTML page.
//
// Default pixel: "Conversion Pixel", owned by the Aligned and Thriving business portfolio.
// NWS pages get their own pixel, owned by the Neurodiverse Wellness Systems portfolio,
// so NWS traffic and leads are counted separately and never land on the default pixel.
const DEFAULT_PIXEL_ID = "441908771967847";
const PIXEL_BY_PREFIX = [
  { prefix: "/neurodiverse-wellness", id: "4431977637052983" }, // NWS Pixel
];
const SKIP_PREFIXES = ["/admin"];

// Pages whose form is a booking (Schedule). Every other form counts as a Lead.
const BOOKING_PATHS = ["/book", "/coregulation/book"];

// ---------------------------------------------------------------------------
// Lead intake
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = [
  "https://nicoleandcasey.com",
  "https://www.nicoleandcasey.com",
];

// Who gets the notification. Must match allowed_destination_addresses in
// wrangler.jsonc, and both must be verified destination addresses in
// Cloudflare Email Routing or the send fails with E_RECIPIENT_NOT_ALLOWED.
const NOTIFY_TO = ["cconnel86@gmail.com", "nicole.tiffany.cruz@gmail.com"];

// Sender for the notification. Must be on a domain onboarded to Cloudflare
// Email Sending. Deliberately not hello@: this is a machine sender, and
// Reply-To carries the submitter so replying from Gmail reaches them.
const NOTIFY_FROM = "forms@nicoleandcasey.com";

const CONFIRM_FROM = "Nicole & Casey <hello@nicoleandcasey.com>";
const CONFIRM_REPLY_TO = "hello@nicoleandcasey.com";

// Field length caps. Anything longer is truncated, not rejected, so a long
// honest answer still reaches us rather than being thrown away.
const MAX_FIELD = 2000;
const MAX_FIELDS = 40;
const MAX_BODY_BYTES = 32 * 1024;

// No newlines: keeps user input out of mail headers.
const EMAIL_RE = /^[^\s@<>,;:"'\\]+@[^\s@<>,;:"'\\]+\.[a-z]{2,}$/i;

// Field order for the notification table. Anything not listed is appended
// after these, so a new form field still shows up without a code change.
const FIELD_ORDER = [
  "Program",
  "First Name",
  "Last Name",
  "Name",
  "Email",
  "Phone",
];
const UTM_FIELDS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "Landing page",
];

// Never shown in the notification body.
const HIDDEN_FIELDS = new Set([
  "_honey",
  "_subject",
  "_template",
  "cf-turnstile-response",
]);

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clean(v) {
  // Strip control characters, collapse to a single trimmed string, cap length.
  return String(v == null ? "" : v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, MAX_FIELD);
}

function jsonResponse(status, body, origin) {
  const headers = { "content-type": "application/json" };
  if (origin) {
    headers["access-control-allow-origin"] = origin;
    headers["vary"] = "Origin";
  }
  return new Response(JSON.stringify(body), { status, headers });
}

async function verifyTurnstile(token, ip, secret) {
  if (!secret) return { ok: false, why: "no-secret" };
  if (!token) return { ok: false, why: "no-token" };
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: form }
    );
    const out = await res.json();
    return { ok: out.success === true, why: (out["error-codes"] || []).join(",") };
  } catch (err) {
    return { ok: false, why: "verify-threw" };
  }
}

function buildRows(data) {
  const seen = new Set([...HIDDEN_FIELDS]);
  const rows = [];
  const push = (k) => {
    if (seen.has(k)) return;
    seen.add(k);
    if (data[k] === undefined || data[k] === "") return;
    rows.push([k, data[k]]);
  };
  FIELD_ORDER.forEach(push);
  Object.keys(data)
    .filter((k) => !UTM_FIELDS.includes(k))
    .forEach(push);
  UTM_FIELDS.forEach(push);
  return rows;
}

function notifyBodies(program, rows) {
  const text =
    `New fit call request: ${program}\n\n` +
    rows.map(([k, v]) => `${k}: ${v}`).join("\n") +
    `\n`;

  const html =
    `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#2f2a26">` +
    `<h2 style="font-weight:500;color:#1e1b19">New fit call request: ${esc(program)}</h2>` +
    `<table cellpadding="6" cellspacing="0" border="0" style="border-collapse:collapse;font-size:14px">` +
    rows
      .map(
        ([k, v]) =>
          `<tr style="border-bottom:1px solid #e4ddd4">` +
          `<td style="color:#6b625b;vertical-align:top;white-space:nowrap">${esc(k)}</td>` +
          `<td style="vertical-align:top">${esc(v).replace(/\n/g, "<br>")}</td></tr>`
      )
      .join("") +
    `</table></body></html>`;

  return { text, html };
}

function confirmBodies(firstName, program) {
  const hi = firstName ? `Hi ${firstName},` : "Hi,";
  const text =
    `${hi}\n\n` +
    `Thanks for reaching out about ${program}. We got your request, and one of us will email you within a day to find a time for your free fit call.\n\n` +
    `The fit call is a short video call. We'll talk about what you're looking for and whether this is a good fit. No pressure, no countdown.\n\n` +
    `If you have a question before then, just reply to this email.\n\n` +
    `Nicole and Casey\n` +
    `nicoleandcasey.com\n\n` +
    `(If you didn't request this, you can ignore this email.)\n`;

  const p = `margin:0 0 16px`;
  const html =
    `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:16px;line-height:1.6;color:#2f2a26">` +
    `<p style="${p}">${esc(hi)}</p>` +
    `<p style="${p}">Thanks for reaching out about ${esc(program)}. We got your request, and one of us will email you within a day to find a time for your free fit call.</p>` +
    `<p style="${p}">The fit call is a short video call. We'll talk about what you're looking for and whether this is a good fit. No pressure, no countdown.</p>` +
    `<p style="${p}">If you have a question before then, just reply to this email.</p>` +
    `<p style="${p}">Nicole and Casey<br>nicoleandcasey.com</p>` +
    `<p style="margin:24px 0 0;font-size:13px;color:#6b625b">(If you didn't request this, you can ignore this email.)</p>` +
    `</body></html>`;

  return { text, html };
}

async function sendConfirmation(env, toEmail, firstName, program) {
  if (!env.RESEND_API_KEY) return;
  const { text, html } = confirmBodies(firstName, program);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: CONFIRM_FROM,
      to: [toEmail],
      reply_to: CONFIRM_REPLY_TO,
      subject: firstName
        ? `We got your request, ${firstName}`
        : "We got your request",
      text,
      html,
    }),
  });
  if (!res.ok) {
    console.log("confirmation failed", res.status, await res.text().catch(() => ""));
  }
}

async function handleLead(request, env, ctx) {
  const origin = request.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: allowed ? 204 : 403,
      headers: allowed
        ? {
            "access-control-allow-origin": origin,
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
            "access-control-max-age": "86400",
            vary: "Origin",
          }
        : {},
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }
  if (!allowed) {
    return jsonResponse(403, { error: "bad_origin" });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return jsonResponse(413, { error: "too_large" }, origin);
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch (err) {
    return jsonResponse(400, { error: "bad_json" }, origin);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonResponse(400, { error: "bad_json" }, origin);
  }

  // Honeypot. 200 so a bot sees success and does not retry, but nothing is sent.
  if (clean(body._honey)) {
    return jsonResponse(200, { ok: true }, origin);
  }

  const data = {};
  let count = 0;
  for (const [k, v] of Object.entries(body)) {
    if (count >= MAX_FIELDS) break;
    if (typeof v !== "string" && typeof v !== "number") continue;
    const key = clean(k).slice(0, 80);
    if (!key || HIDDEN_FIELDS.has(key)) continue;
    const val = clean(v);
    if (!val) continue;
    data[key] = val;
    count++;
  }

  const email = clean(body.Email);
  if (!EMAIL_RE.test(email)) {
    return jsonResponse(400, { error: "bad_email" }, origin);
  }
  data.Email = email;

  const ts = await verifyTurnstile(
    clean(body["cf-turnstile-response"]),
    request.headers.get("CF-Connecting-IP"),
    env.TURNSTILE_SECRET
  );
  if (!ts.ok) {
    return jsonResponse(400, { error: "turnstile_failed", why: ts.why }, origin);
  }

  const program = data.Program || "Unspecified";
  const firstName = data["First Name"] || data.Name || "";
  const rows = buildRows(data);
  const { text, html } = notifyBodies(program, rows);

  // Notify us. This one is awaited: if it fails, the visitor is told, and
  // cta-form.js falls back to FormSubmit so the lead is never lost.
  if (!env.NOTIFY_EMAIL) {
    return jsonResponse(500, { error: "no_binding" }, origin);
  }
  try {
    await env.NOTIFY_EMAIL.send({
      from: NOTIFY_FROM,
      to: NOTIFY_TO,
      // camelCase: the Workers binding uses replyTo. The REST API and
      // Resend both use reply_to, and passing that here is ignored
      // silently, which would send replies to NOTIFY_FROM instead.
      replyTo: email,
      subject: `New fit call request: ${program}`,
      text,
      html,
    });
  } catch (err) {
    console.log("notification failed", err && err.message);
    return jsonResponse(502, { error: "notify_failed" }, origin);
  }

  // Confirm to the submitter after we have already answered the browser, so
  // it never slows the visitor down. A failure here is logged, not surfaced.
  ctx.waitUntil(
    sendConfirmation(env, email, firstName, program).catch((err) =>
      console.log("confirmation threw", err && err.message)
    )
  );

  return jsonResponse(200, { ok: true }, origin);
}

// ---------------------------------------------------------------------------
// Meta Pixel
// ---------------------------------------------------------------------------

function pixelSnippet(id) {
  return `
<!-- Meta Pixel -->
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${id}');
fbq('track', 'PageView');

(function () {
  var BOOKING = ${JSON.stringify(BOOKING_PATHS)};
  var path = location.pathname.replace(/\\/+$/, '') || '/';
  var isBooking = BOOKING.indexOf(path) !== -1;

  // Lead / Schedule: fire only after the send is confirmed successful.
  // Two senders count: the site's own /api/lead, and the FormSubmit
  // fallback cta-form.js uses when /api/lead cannot be reached.
  //
  // fired guards against counting one submission twice when the fallback
  // runs after /api/lead has already succeeded. The form hides on success,
  // so there is no second legitimate submission on these pages.
  var fired = false;
  var origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var p = origFetch.apply(this, arguments);

      var isApi = url.indexOf('/api/lead') !== -1;
      var isFormSubmit = url.indexOf('formsubmit.co/ajax/') !== -1;
      if (!isApi && !isFormSubmit) return p;

      var program = '';
      try { program = JSON.parse(init && init.body || '{}').Program || ''; } catch (e) {}

      p.then(function (res) {
        if (!res || !res.ok || fired) return;
        fired = true;
        var params = { content_name: program || path, content_category: path };
        try { fbq('track', isBooking ? 'Schedule' : 'Lead', params); } catch (e) {}
      }).catch(function () {});
      return p;
    };
  }

  // Contact: clicks on email or phone links.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="mailto:"], a[href^="tel:"]');
    if (!a) return;
    try {
      fbq('track', 'Contact', {
        content_name: a.getAttribute('href').indexOf('tel:') === 0 ? 'phone' : 'email',
        content_category: path
      });
    } catch (e) {}
  }, true);
})();
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1"/></noscript>
<!-- End Meta Pixel -->
`;
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;

    // Runs before the static assets: run_worker_first is on, so this route
    // is ours and never falls through to a 404 from ASSETS.
    if (path === "/api/lead") return handleLead(request, env, ctx);

    const response = await env.ASSETS.fetch(request);

    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html")) return response;
    if (SKIP_PREFIXES.some((p) => path.startsWith(p))) return response;

    const match = PIXEL_BY_PREFIX.find((m) => path.startsWith(m.prefix));
    const PIXEL_ID = match ? match.id : DEFAULT_PIXEL_ID;
    if (!/^\d+$/.test(PIXEL_ID)) return response;

    return new HTMLRewriter()
      .on("head", {
        element(el) {
          el.append(pixelSnippet(PIXEL_ID), { html: true });
        },
      })
      .transform(response);
  },
};
