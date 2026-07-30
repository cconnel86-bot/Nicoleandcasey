/* Text-request CTA on Nicole's program pages.
   Sends to hello@ via FormSubmit. The hidden Program field is what tells
   Nicole which page the request came from. */
(function () {
  var DEST = 'hello@nicoleandcasey.com';
  var form = document.getElementById('ctaForm');
  if (!form) return;

  var loadedAt = Date.now();
  var btn = form.querySelector('.cta-btn');
  var btnLabel = btn ? btn.textContent : 'Send';

  function succeed() {
    form.style.display = 'none';
    document.getElementById('ctaSuccess').style.display = 'block';
  }
  function show(id, on) {
    var el = document.getElementById(id);
    if (el) el.style.display = on ? 'block' : 'none';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }

    // Turnstile. Fails open if the widget could not load, so an ad blocker
    // never stops a real person from reaching Nicole.
    var tsToken = '';
    if (window.turnstile) {
      tsToken = turnstile.getResponse();
      if (!tsToken) { show('ctaTsNote', true); return; }
      show('ctaTsNote', false);
    }

    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });

    // Honeypot + timing. Silent on purpose: a bot that sees an error retries.
    if (data._honey || (Date.now() - loadedAt) < 3000) { succeed(); return; }
    delete data._honey;

    if (btn) { btn.disabled = true; btn.textContent = 'Sending\u2026'; }

    var payload = Object.assign({}, data, {
      _subject: 'New text request: ' + (data.Program || 'Unspecified'),
      _template: 'table',
      'cf-turnstile-response': tsToken
    });

    fetch('https://formsubmit.co/ajax/' + DEST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error('send failed');
      succeed();
    }).catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
      if (window.turnstile) turnstile.reset();
      show('ctaError', true);
    });
  });
})();
