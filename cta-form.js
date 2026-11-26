/* Lead CTA used by the program pages.

   Posts to the site's own /api/lead, which verifies the Turnstile token
   server-side, emails us, and sends the person a confirmation.

   If /api/lead cannot be reached or returns a server error, it falls back
   to the old FormSubmit request so a lead is never lost. A 400 means the
   request was rejected on purpose (bot check or a bad email), so it is
   shown to the person instead of being retried. */
(function () {
  var API = '/api/lead';
  var DEST = 'hello@nicoleandcasey.com';
  var form = document.getElementById('ctaForm');
  if (!form) return;

  var loadedAt = Date.now();
  var btn = form.querySelector('.cta-btn');
  var btnLabel = btn ? btn.textContent : 'Send';

  function succeed(firstName) {
    form.style.display = 'none';
    var box = document.getElementById('ctaSuccess');
    if (!box) return;
    if (firstName) {
      var h = box.querySelector('h3');
      // textContent, not innerHTML: the name came from a text field.
      if (h) h.textContent = 'Thank you, ' + firstName + '. We got it.';
    }
    box.style.display = 'block';
  }
  function show(id, on) {
    var el = document.getElementById(id);
    if (el) el.style.display = on ? 'block' : 'none';
  }
  function reset() {
    if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
    if (window.turnstile) turnstile.reset();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }

    // Turnstile. Fails open here if the widget could not load, so an ad
    // blocker never stops a real person. The server still verifies the
    // token, so a missing one is rejected there.
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

    // Screening. Any field marked data-qualify="a|b" must hold one of those
    // answers. Pages without screening fields send no Qualified value.
    var screens = form.querySelectorAll('[data-qualify]');
    if (screens.length) {
      var ok = Array.prototype.every.call(screens, function (el) {
        return el.getAttribute('data-qualify').split('|').indexOf(el.value) !== -1;
      });
      data.Qualified = ok ? 'Yes' : 'No';
    }

    var firstName = (data['First Name'] || data.Name || '').trim().split(/\s+/)[0] || '';

    if (btn) { btn.disabled = true; btn.textContent = 'Sending\u2026'; }
    show('ctaError', false);

    var payload = Object.assign({}, data, { 'cf-turnstile-response': tsToken });

    function viaFormSubmit() {
      return fetch('https://formsubmit.co/ajax/' + DEST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(Object.assign({}, payload, {
          _subject: 'New fit call request: ' + (data.Program || 'Unspecified'),
          _template: 'table'
        }))
      }).then(function (res) {
        if (!res.ok) throw new Error('fallback failed');
        succeed(firstName);
      }).catch(function () {
        reset();
        show('ctaError', true);
      });
    }

    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (res.ok) { succeed(firstName); return; }

      // Rejected on purpose. Do not retry through FormSubmit: the same
      // request would fail the same way, or worse, skip the bot check.
      if (res.status === 400 || res.status === 403 || res.status === 413) {
        return res.json().catch(function () { return {}; }).then(function (out) {
          reset();
          if (out && out.error === 'bad_email') show('ctaError', true);
          else show('ctaTsNote', true);
        });
      }

      // 5xx or anything else: the send is broken on our side, not theirs.
      return viaFormSubmit();
    }).catch(function () {
      // Network error, DNS failure, offline, blocked request.
      return viaFormSubmit();
    });
  });
})();
