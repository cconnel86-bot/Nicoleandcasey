// Serves the static site and injects the Meta Pixel into every HTML page..
// Pixel ID: "Conversion Pixel", owned by Aligned and Thriving business portfolio.
const PIXEL_ID = "441908771967847";
const SKIP_PREFIXES = ["/admin"];

// Pages whose form is a booking (Schedule). Every other form counts as a Lead.
const BOOKING_PATHS = ["/book", "/coregulation/book"];

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

  // Lead / Schedule: fire only after FormSubmit confirms the send succeeded,
  // matching the success check the site's own forms use (res.ok).
  var origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var p = origFetch.apply(this, arguments);
      if (url.indexOf('formsubmit.co/ajax/') === -1) return p;

      var program = '';
      try { program = JSON.parse(init && init.body || '{}').Program || ''; } catch (e) {}

      p.then(function (res) {
        if (!res || !res.ok) return;
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
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);

    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html")) return response;
    if (!/^\d+$/.test(PIXEL_ID)) return response;

    const path = new URL(request.url).pathname;
    if (SKIP_PREFIXES.some((p) => path.startsWith(p))) return response;

    return new HTMLRewriter()
      .on("head", {
        element(el) {
          el.append(pixelSnippet(PIXEL_ID), { html: true });
        },
      })
      .transform(response);
  },
};
