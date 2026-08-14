import { initAnimationInspector } from './debug-panel.js'
import { portfolioCases } from './portfolio-data.js'

const CASE_PATH = /^\/(micromilspec|off-market|misc)\/?$/

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
    prefetch: [{ urls: ['/', '/micromilspec/', '/off-market/', '/misc/', '/about/', '/praise/'], eagerness: 'immediate' }],
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

/* Nav-zoom: samme kamera-prinsipp som case-zoomen, men forankret i tekstlenken.
   Klikk på About/Praise → verden skalerer svakt (1.25) mot lenken og fader;
   tilbake → verden kommer inn igjen fra samme punkt. Logo-klikk (hjem) leses som
   retur og zoomer ut. Logo/meny har egne transition-lag og står i ro imens. */
function initNavZoom(header) {
  const links = header.querySelectorAll('.site-header__brand, nav a')
  links.forEach((link) => {
    link.addEventListener('click', () => {
      const rect = link.getBoundingClientRect()
      sessionStorage.setItem(
        'nav:zoom-origin',
        `${Math.round(rect.left + rect.width / 2)}px ${Math.round(rect.top + rect.height / 2)}px`,
      )
      sessionStorage.setItem('nav:zoom-dir', new URL(link.href).pathname === '/' ? 'out' : 'in')
      sessionStorage.setItem('nav:zoom', '1')
    })
  })

  /* Før snapshot av siden vi forlater: gi nav-lenken som peker dit vi skal navnet
     nav-focus — den morpher da fysisk inn i destinasjonens store sidetittel.
     (h1-en på denne siden må samtidig gi fra seg navnet, ellers kolliderer de.) */
  window.addEventListener('pageswap', (event) => {
    if (!event.viewTransition) return
    let toPath = null
    try {
      toPath = new URL(event.activation?.entry?.url ?? '', location.origin).pathname
    } catch {
      toPath = null
    }
    if (toPath !== '/about/' && toPath !== '/praise/') return
    const ownTitle = document.querySelector('.page-title')
    if (ownTitle) ownTitle.style.viewTransitionName = 'none'
    const link = header.querySelector(`nav a[href="${toPath}"]`)
    if (link) link.style.viewTransitionName = 'nav-focus'
  })

  window.addEventListener('pagereveal', (event) => {
    if (!event.viewTransition) return

    /* Rydd opp evt. inline-navn fra en tidligere pageswap (bfcache-restore). */
    links.forEach((link) => {
      link.style.viewTransitionName = ''
    })
    document.querySelector('.page-title')?.style.removeProperty('view-transition-name')

    const fromUrl = window.navigation?.activation?.from?.url ?? document.referrer
    let fromPath = null
    try {
      fromPath = new URL(fromUrl).pathname
    } catch {
      fromPath = null
    }
    /* Hjem ↔ case eies av case-zoomen (timeline.js / case.js). */
    if (fromPath && CASE_PATH.test(fromPath)) return
    if (CASE_PATH.test(location.pathname)) return

    const root = document.documentElement
    let direction = null
    let origin = null

    if (sessionStorage.getItem('nav:zoom') === '1') {
      direction = sessionStorage.getItem('nav:zoom-dir') === 'out' ? 'out' : 'in'
      origin = sessionStorage.getItem('nav:zoom-origin')
    } else if (fromPath && fromPath !== location.pathname) {
      /* Traverse (tilbake/frem-knapp): anker i lenken som peker dit vi kom fra. */
      direction = location.pathname === '/' ? 'out' : 'in'
      const anchorPath = direction === 'out' ? fromPath : location.pathname
      const anchor = header.querySelector(`nav a[href="${anchorPath}"]`)
      if (anchor) {
        const rect = anchor.getBoundingClientRect()
        origin = `${Math.round(rect.left + rect.width / 2)}px ${Math.round(rect.top + rect.height / 2)}px`
      }
    }

    sessionStorage.removeItem('nav:zoom')
    if (!direction) return

    const cleanupTasks = []

    if (direction === 'in') {
      /* Innholdet under sidetittelen kaskaderer inn (CSS: .page-entering). */
      root.classList.add('page-entering')
    }

    if (direction === 'out' && fromPath) {
      /* Sidetittelen på siden vi forlater morpher tilbake inn i nav-lenken sin. */
      const target = header.querySelector(`nav a[href="${fromPath}"]`)
      if (target) {
        target.style.viewTransitionName = 'nav-focus'
        cleanupTasks.push(() => {
          target.style.viewTransitionName = ''
        })
      }
    }

    if (origin) root.style.setProperty('--vt-origin', origin)
    const className = direction === 'out' ? 'vt-navzoom-out' : 'vt-navzoom-in'
    root.classList.add(className)
    cleanupTasks.push(() => root.classList.remove(className))

    const cleanup = () => cleanupTasks.forEach((task) => task())
    event.viewTransition.finished.then(cleanup, cleanup)
  })
}

export function initHeader() {
  initSpeculationRules()
  initAnimationInspector()
  scheduleWarmup()

  const header = document.querySelector('.site-header')
  if (!header) return null

  initNavZoom(header)

  function updateHeaderScrollState() {
    header.classList.toggle('is-scrolled', window.scrollY > 8)
  }

  updateHeaderScrollState()
  window.addEventListener('scroll', updateHeaderScrollState, { passive: true })

  return header
}
