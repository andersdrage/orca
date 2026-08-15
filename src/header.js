import { initAnimationInspector } from './debug-panel.js'
import { portfolioCases } from './portfolio-data.js'
import { applyNavVariantAttribute, getNavVariant } from './nav-variant.js'
import { initSpaNav, spaNavigate } from './spa-nav.js'

const CASE_PATH = /^\/(micromilspec|off-market|misc|hjemla)\/?$/

/* Rekkefølgen i «verden»: forsiden lengst til venstre, så About, så Praise. */
const PAGE_ORDER = { '/': 0, '/about/': 1, '/praise/': 2 }

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

/* Nav-zoom: samme kamera-prinsipp som case-zoomen, men forankret i tekstlenken.
   Klikk på About/Praise → verden skalerer svakt (1.25) mot lenken og fader;
   tilbake → verden kommer inn igjen fra samme punkt. Logo-klikk (hjem) leses som
   retur og zoomer ut. Logo/meny har egne transition-lag og står i ro imens. */
/* Transition-lab for hjem ↔ About/Praise: fem varianter, valgt i bryteren på
   forsiden (data-nav-variant på <html>). Alle beregner geometri fra nav-lenkene
   ved reveal — headeren er identisk på tvers av sidene, så posisjonene stemmer. */

function linkInset(link) {
  const rect = link.getBoundingClientRect()
  const right = Math.max(0, Math.round(window.innerWidth - rect.right))
  const bottom = Math.max(0, Math.round(window.innerHeight - rect.bottom))
  return `inset(${Math.round(rect.top)}px ${right}px ${bottom}px ${Math.round(rect.left)}px round 18px)`
}

function initNavTransitions(header) {
  applyNavVariantAttribute()
  initSpaNav()

  const links = [...header.querySelectorAll('.site-header__brand, nav a')]

  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      const toPath = new URL(link.href).pathname

      /* Klikk på lenken til siden man allerede står på (f.eks. logoen på
         forsiden) skal ikke re-navigere — det utløser en full reload med
         crossfade og tidslinje-reset, som ser ut som at innholdet «hopper». */
      if (toPath === location.pathname) {
        event.preventDefault()
        return
      }

      /* Variant «spa»: klikk til About/Praise intercepts — samme dokument, ekte FLIP. */
      if (getNavVariant() !== 'spa') return
      if (toPath !== '/about/' && toPath !== '/praise/') return
      event.preventDefault()
      spaNavigate(link)
    })
  })

  /* Variant «title»: lenken vi forlater via må løftes til eget lag FØR snapshot. */
  window.addEventListener('pageswap', (event) => {
    if (!event.viewTransition) return
    if (getNavVariant() !== 'title') return
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
    if (fromPath === null || CASE_PATH.test(fromPath) || CASE_PATH.test(location.pathname)) return

    const from = PAGE_ORDER[fromPath]
    const to = PAGE_ORDER[location.pathname]
    if (from === undefined || to === undefined || from === to) return

    const forward = to > from
    const variant = getNavVariant()
    const root = document.documentElement
    const cleanupTasks = []
    const addClass = (name) => {
      root.classList.add(name)
      cleanupTasks.push(() => root.classList.remove(name))
    }

    if (variant === 'pan') {
      addClass(forward ? 'vt-pan-fwd' : 'vt-pan-back')
    } else if (variant === 'portal') {
      /* Portalen åpner/lukker seg fra nav-lenken til siden det gjelder. */
      const anchor = header.querySelector(`nav a[href="${forward ? location.pathname : fromPath}"]`)
      if (anchor) root.style.setProperty('--vt-clip-rect', linkInset(anchor))
      addClass(forward ? 'vt-portal-in' : 'vt-portal-out')
    } else if (variant === 'title') {
      if (forward) {
        addClass('vt-title-in')
        addClass('page-entering')
      } else {
        const target = header.querySelector(`nav a[href="${fromPath}"]`)
        if (target) {
          target.style.viewTransitionName = 'nav-focus'
          cleanupTasks.push(() => {
            target.style.viewTransitionName = ''
          })
        }
        addClass('vt-title-out')
      }
    } else if (variant === 'editorial') {
      if (forward) {
        addClass('vt-editorial-in')
        addClass('page-entering')
      } else {
        addClass('vt-editorial-out')
      }
    }
    /* «spa» intercepts klikk før navigasjon; havner vi her (traverse), kjør default. */

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

  initNavTransitions(header)

  function updateHeaderScrollState() {
    header.classList.toggle('is-scrolled', window.scrollY > 8)
  }

  updateHeaderScrollState()
  window.addEventListener('scroll', updateHeaderScrollState, { passive: true })

  return header
}
