import { initAnimationInspector } from './debug-panel.js'
import { initFpsMeter } from './fps-meter.js'
import { portfolioCases } from './portfolio-data.js'
import { initWorld } from './world.js'

/* Speculation Rules: prefetch alle hovedsider umiddelbart (kun HTML, noen få KB),
   og prerender ved hover-intensjon — da er case-siden ferdig rendret (inkl. bilder)
   før klikket, og view-transition-morphen får ekte innhold å lande i.
   Safari/Firefox ignorerer dette; de dekkes av idle-warming under. */
function initSpeculationRules() {
  if (!HTMLScriptElement.supports?.('speculationrules')) return
  if (document.querySelector('script[type="speculationrules"]')) return

  const script = document.createElement('script')
  script.type = 'speculationrules'
  script.textContent = JSON.stringify({
    prefetch: [{ urls: ['/', '/micromilspec/', '/hjemla/', '/off-market/', '/misc/', '/about/', '/praise/', '/archive/'], eagerness: 'immediate' }],
    /* Nettleseren tillater maks ~2 umiddelbare prerenders: bruk dem på de to
       casene nærmest i tidslinjen ved last. Resten prerendres ved hover (LRU) —
       og dyp-warmingen under gjør at selv uprerendrede klikk maler umiddelbart. */
    prerender: [
      { urls: ['/micromilspec/', '/hjemla/'], eagerness: 'immediate' },
      { urls: ['/off-market/', '/misc/'], eagerness: 'moderate' },
      { where: { href_matches: '/*' }, eagerness: 'moderate' },
    ],
  })
  document.head.append(script)
}

/* Dyp-warming: ALT en case-side trenger for første frame hentes i idle-tid —
   HTML, JS- og CSS-assets (parset ut av HTML-en) pluss covere/postere. Da maler
   siden umiddelbart selv uten prerender, og view transition-en rekker fristen.
   Videofilene (mange MB) holdes utenfor; de er pauset under selve overgangen. */
function warmCaseAssets() {
  portfolioCases.forEach((singleCase) => {
    singleCase.items.slice(0, 2).forEach((item) => {
      const src = `/images/${item.file}`
      const url = /\.(mp4|webm|mov)$/i.test(item.file) ? src.replace(/\.(mp4|webm|mov)$/i, '-poster.jpg') : src
      fetch(url, { priority: 'low' }).catch(() => {})
    })
  })

  const casePages = ['/micromilspec/', '/hjemla/', '/off-market/', '/misc/']
  casePages.forEach((path) => {
    fetch(path, { priority: 'low' })
      .then((response) => response.text())
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html')
        const assets = [
          ...[...doc.querySelectorAll('script[src]')].map((el) => el.getAttribute('src')),
          ...[...doc.querySelectorAll('link[rel="stylesheet"][href]')].map((el) => el.getAttribute('href')),
        ]
        assets.forEach((asset) => {
          if (asset) fetch(asset, { priority: 'low' }).catch(() => {})
        })
      })
      .catch(() => {})
  })
}

function scheduleWarmup() {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(warmCaseAssets, { timeout: 3000 })
  } else {
    setTimeout(warmCaseAssets, 1500)
  }
}

/* Klikk på lenken til siden man allerede står på (f.eks. logoen på forsiden)
   skal ikke re-navigere. Dragen jigglier i stedet: «vi fikk touchen din,
   men du er allerede her». */
function initSamePageGuard(header) {
  header.querySelectorAll('.site-header__brand, nav a').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (new URL(link.href).pathname !== location.pathname) return
      event.preventDefault()
      if (link.classList.contains('site-header__brand')) {
        link.classList.remove('is-jiggling')
        void link.offsetWidth
        link.classList.add('is-jiggling')
      }
    })
  })
}

export function initHeader() {
  initSpeculationRules()
  initAnimationInspector()
  initFpsMeter()
  scheduleWarmup()

  const header = document.querySelector('.site-header')
  if (!header) return null

  initSamePageGuard(header)

  /* Kamera-verdenen (index ↔ About ↔ Praise i samme dokument). På case-sider
     gjør initWorld ingenting, og scroll-lytteren under gjelder der i stedet
     (i world-mode scroller seksjonene internt — world.js har egen lytter). */
  initWorld(header)

  function updateHeaderScrollState() {
    header.classList.toggle('is-scrolled', window.scrollY > 8)
  }

  if (!document.body.classList.contains('world-mode')) {
    updateHeaderScrollState()
    window.addEventListener('scroll', updateHeaderScrollState, { passive: true })
  }

  return header
}
