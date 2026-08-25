import { initAnimationInspector } from './debug-panel.js'
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
    prefetch: [{ urls: ['/', '/micromilspec/', '/hjemla/', '/off-market/', '/misc/', '/about/', '/praise/'], eagerness: 'immediate' }],
    prerender: [{ where: { href_matches: '/*' }, eagerness: 'moderate' }],
  })
  document.head.append(script)
}

/* Varm HTTP-cachen for tidslinje-covere og case-sidenes øverste innhold fra ALLE
   sider (ikke bare forsiden) — ellers viser transition-snapshots udekodede tiles
   (svart flate) når man kommer fra f.eks. About. Kun bilder/postere, aldri video. */
function warmCaseAssets() {
  const urls = portfolioCases.flatMap((singleCase) =>
    singleCase.items.slice(0, 2).map((item) => {
      const src = `/images/${item.file}`
      return /\.(mp4|webm|mov)$/i.test(item.file) ? src.replace(/\.(mp4|webm|mov)$/i, '-poster.jpg') : src
    }),
  )
  urls.forEach((url) => {
    fetch(url, { priority: 'low' }).catch(() => {})
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
