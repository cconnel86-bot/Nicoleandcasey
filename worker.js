// Serves the static site and injects the Meta Pixel into every HTML page.
// Pixel ID for nicoleandcasey.com (Meta Events Manager).
const PIXEL_ID = "1745572216664966";
const SKIP_PREFIXES = ["/admin"];

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
document.addEventListener('submit', function (e) {
  try {
    var form = e.target;
    fbq('track', 'Lead', { content_name: form.getAttribute('name') || form.id || location.pathname });
  } catch (err) {}
}, true);
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
