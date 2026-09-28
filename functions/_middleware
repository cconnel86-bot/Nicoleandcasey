// Meta (Facebook) Pixel injector for nicoleandcasey.com
// Runs on every request. Adds the pixel to the <head> of every HTML page.
// Paste your numeric Pixel ID below. Until it's a real number, this file does nothing.

const PIXEL_ID = "PASTE_PIXEL_ID_HERE";

// Paths that should never be tracked
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
// Fire Lead on any form submission (booking, contact, etc.)
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

export async function onRequest(context) {
  const response = await context.next();

  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;
  if (!/^\d+$/.test(PIXEL_ID)) return response;

  const path = new URL(context.request.url).pathname;
  if (SKIP_PREFIXES.some((p) => path.startsWith(p))) return response;

  return new HTMLRewriter()
    .on("head", {
      element(el) {
        el.append(pixelSnippet(PIXEL_ID), { html: true });
      },
    })
    .transform(response);
}
