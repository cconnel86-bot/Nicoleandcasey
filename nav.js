/* ============================================================
   SITE NAV — one file, every page.

   Add this line before </body> on any page that should have the bar:
     <script src="/nav.js" defer></script>

   It carries its own CSS, so it works on pages that do not load
   base.css or theme.css. Colours fall back to the theme values.

   Two modes, chosen automatically:
     overlay  the page opens with .hero or .pbanner, so the bar sits
              on top of that image, translucent, cream text
     solid    everything else, so the bar is a normal cream strip
              above the content with dark text

   Editing the menu: change NAV below. Nothing else.
   ============================================================ */

(function () {
  var NAV = [
    { name: 'Nicole', items: [
      { label: 'About Nicole',                 href: '/nicole',                 lead: true },
      { label: 'Soulmaps',                     href: '/soul-map' },
      { label: 'Neurodiverse Wellness Systems',href: '/neurodiverse-wellness' },
      { label: 'Emotional Coregulation',       href: '/coregulation' }
    ]},
    { name: 'Together', items: [
      { label: 'Our story',                    href: '/about',                  lead: true },
      { label: 'Bridge to Healthy Love',       href: '/bridge-to-healthy-love' }
    ]},
    { name: 'Casey', items: [
      { label: 'About Casey',                  href: '/casey',                  lead: true },
      { label: 'Personal Finance Coaching',    href: '/personal-finance-coaching' },
      { label: 'Divorce Coaching',             href: '/divorce-coaching' },
      { label: 'Divorce Mediation',            href: '/divorce-mediation' },
      { label: 'The memoir: Choosing the Same Pain', href: 'https://www.amazon.com/dp/B0GZ7HNV9P?ref_=ppx_hzsearch_conn_dt_b_fed_asin_title_4', aside: true, ext: true }
    ]}
  ];

  var CSS = [
    '.topnav{position:relative;z-index:40;display:flex;align-items:center;justify-content:center;',
    'gap:clamp(1.4rem,5vw,2.6rem);padding:.7rem 1rem;font-family:var(--font-body,"Jost",system-ui,sans-serif)}',
    '.topnav .nv{position:relative;padding-bottom:.45rem}',
    '.topnav .nvdrop::before{content:"";position:absolute;left:-1.5rem;right:-1.5rem;top:-1.2rem;height:1.3rem}',
    '.topnav .nvtop{font-family:var(--font-heading,"Cormorant Garamond",Georgia,serif);',
    'font-size:1.15rem;line-height:1.2;cursor:pointer;padding:.2rem .1rem;display:inline-flex;',
    'align-items:center;gap:.35rem;border-bottom:1px solid transparent;user-select:none}',
    '.topnav .nvtop svg{width:.6em;height:.6em;flex:0 0 auto}',
    '.topnav .nvdrop{position:absolute;top:100%;left:50%;transform:translateX(-50%);',
    'background:var(--surface,#ffffff);border:1px solid var(--border,#e3ded6);min-width:15rem;',
    'padding:.25rem 0;margin-top:0;opacity:0;visibility:hidden;transition:opacity .16s;z-index:50}',
    '.topnav .nv.open .nvdrop{opacity:1;visibility:visible}',
    '.topnav .nvdrop a{display:block;padding:.45rem .9rem;font-size:.72rem;line-height:1.4;',
    'color:var(--text,#2f2c28);text-decoration:none;white-space:nowrap}',
    '.topnav .nvdrop a.lead{font-family:var(--font-heading,"Cormorant Garamond",Georgia,serif);',
    'font-size:.82rem;color:var(--heading,#1d1b18);border-bottom:1px solid var(--border,#e3ded6)}',
    '.topnav .nvdrop a.aside{border-top:1px solid var(--border,#e3ded6);',
    'color:var(--accent,#8a7d6b);font-size:.66rem}',
    '.topnav .nvdrop a:hover{background:var(--bg,#f4f2ee);color:var(--accent,#8a7d6b)}',
    /* overlay: sitting on a dark hero or banner */
    '.topnav.overlay{position:absolute;top:0;left:0;right:0;background:rgba(29,27,24,.58);',
    'border-bottom:1px solid rgba(244,242,238,.18)}',
    '.topnav.overlay .nvtop{color:var(--bg,#f4f2ee)}',
    '.topnav.overlay .nvtop svg{color:#bcb0a0}',
    '.topnav.overlay .nv:hover .nvtop,.topnav.overlay .nv.open .nvtop{border-bottom-color:#bcb0a0}',
    /* solid: no banner to sit on */
    '.topnav.solid{background:var(--bg,#f4f2ee);border-bottom:1px solid var(--border,#e3ded6)}',
    '.topnav.solid .nvtop{color:var(--heading,#1d1b18)}',
    '.topnav.solid .nvtop svg{color:var(--accent,#8a7d6b)}',
    '.topnav.solid .nv:hover .nvtop,.topnav.solid .nv.open .nvtop{border-bottom-color:var(--accent,#8a7d6b)}',
    /* the old per-page back links are what this bar replaces */
    'body.has-topnav .back-link,body.has-topnav .dc-back,body.has-topnav .dm-back,',
    'body.has-topnav .pf-back,body.has-topnav .bk-back,body.has-topnav .pbanner .back{display:none}',
    '@media (max-width:30rem){.topnav{gap:1.1rem;padding:.6rem .5rem}',
    '.topnav .nvtop{font-size:1rem}.topnav .nvdrop{min-width:12rem}}'
  ].join('');

  var CHEV = '<svg viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M1 1l4 4 4-4"/></svg>';

  function build() {
    var host = document.body;
    if (!host || document.querySelector('.topnav')) return;

    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var first = host.firstElementChild;
    var overlayTarget = null;
    while (first && first.nodeType === 1) {
      if (first.classList.contains('hero') || first.classList.contains('pbanner')) {
        overlayTarget = first; break;
      }
      if (first.tagName === 'SCRIPT' || first.tagName === 'STYLE') { first = first.nextElementSibling; continue; }
      break;
    }

    var bar = document.createElement('nav');
    bar.className = 'topnav ' + (overlayTarget ? 'overlay' : 'solid');
    bar.setAttribute('aria-label', 'Main');

    var here = location.pathname.replace(/\/+$/, '') || '/';
    var html = '';
    NAV.forEach(function (group, gi) {
      html += '<div class="nv"><span class="nvtop" role="button" tabindex="0" aria-expanded="false" aria-haspopup="true">'
           +  group.name + CHEV + '</span><div class="nvdrop">';
      group.items.forEach(function (it) {
        if (it.href.replace(/\/+$/, '') === here) return;
        html += '<a href="' + it.href + '"'
             +  (it.lead ? ' class="lead"' : it.aside ? ' class="aside"' : '')
             +  (it.ext ? ' target="_blank" rel="noopener"' : '')
             +  '>' + it.label + '</a>';
      });
      html += '</div></div>';
    });
    bar.innerHTML = html;

    if (overlayTarget) {
      if (getComputedStyle(overlayTarget).position === 'static') overlayTarget.style.position = 'relative';
      overlayTarget.insertBefore(bar, overlayTarget.firstChild);
    } else {
      host.insertBefore(bar, host.firstChild);
    }
    host.classList.add('has-topnav');

    var items = bar.querySelectorAll('.nv');
    var shutTimer;
    function closeAll() {
      clearTimeout(shutTimer);
      Array.prototype.forEach.call(items, function (x) {
        x.classList.remove('open');
        x.querySelector('.nvtop').setAttribute('aria-expanded', 'false');
      });
    }
    Array.prototype.forEach.call(items, function (it) {
      var top = it.querySelector('.nvtop');
      function toggle(e) {
        e.preventDefault(); e.stopPropagation();
        var was = it.classList.contains('open');
        closeAll();
        if (!was) { it.classList.add('open'); top.setAttribute('aria-expanded', 'true'); }
      }
      top.addEventListener('click', toggle);
      top.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') toggle(e);
        if (e.key === 'Escape') closeAll();
      });

      if (window.matchMedia && window.matchMedia('(hover:hover)').matches) {
        it.addEventListener('mouseenter', function () {
          clearTimeout(shutTimer);
          closeAll();
          it.classList.add('open');
          top.setAttribute('aria-expanded', 'true');
        });
        it.addEventListener('mouseleave', function (e) {
          if (e.relatedTarget && it.contains(e.relatedTarget)) return;
          clearTimeout(shutTimer);
          shutTimer = setTimeout(closeAll, 450);
        });
        var panel = it.querySelector('.nvdrop');
        panel.addEventListener('mouseenter', function () { clearTimeout(shutTimer); });
      }
    });
    document.addEventListener('click', closeAll);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
