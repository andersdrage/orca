import { initAnimationInspector } from './debug-panel.js'
import { initDesignAudit } from './design-audit.js'
import { portfolioCases } from './portfolio-data.js'
import { initWorld } from './world.js'
import { syncVisibleMedia } from './visible-media.js'
import { isSameTabNavigation } from './link-navigation.js'
import { sessionState } from './session-state.js'

// Prepare only the case the visitor points to, focuses, or touches. Keep a
// finite featured-case budget and deduplicate shared scripts/styles across cases.
function initCaseWarmup() {
  const paths = new Map(portfolioCases.map((project) => [`/${project.id}/`, project]))
  const cases = new Set()
  const assets = new Set()
  const images = new Map()
  const savingData = () => navigator.connection?.saveData || /(^|-)2g$/.test(navigator.connection?.effectiveType ?? '')
  const fetchOnce = (url) => {
    const absolute = new URL(url, location.href)
    if (absolute.origin !== location.origin || assets.has(absolute.href)) return Promise.resolve(null)
    assets.add(absolute.href)
    return fetch(absolute.href, { priority: 'low' }).catch(() => null)
  }
  const warm = (event) => {
    if (savingData()) return
    const link = event.target.closest('a[href]')
    if (!link || link.origin !== location.origin || link.pathname === location.pathname) return
    const project = paths.get(link.pathname)
    if (!project || cases.has(project.id) || cases.size >= portfolioCases.length) return
    cases.add(project.id)
    // The text-first case reveals the next media row, not its hidden cover.
    // Decode that still/poster on intent; never download a speculative video.
    const first = sessionState.getItem('case:presentation') !== 'false' && project.items.length > 1 && !project.keepCoverInPresentation ? 1 : 0
    const item = project.items[first]
    const row = item?.span === 'half' ? project.items.slice(first, first + 2) : [item]
    row.forEach(item => {
      if (!item?.file) return
      const src = `/images/${item.file.replace(/\.(mp4|webm|mov)$/i, '-poster.jpg')}`
      if (images.has(src)) return
      const image = new Image()
      image.decoding = 'async'
      image.fetchPriority = 'low'
      image.src = src
      images.set(src, image)
      image.decode().catch(() => {})
    })
    fetchOnce(link.href).then(async (response) => {
      if (!response?.ok) return
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html')
      doc.querySelectorAll('script[src], link[rel="stylesheet"][href], link[rel="modulepreload"][href], link[as="font"][href]').forEach((el) => {
        const asset = el.getAttribute('src') || el.getAttribute('href')
        if (asset) fetchOnce(new URL(asset, link.href).href)
      })
    }).catch(() => {})
  }
  document.addEventListener('pointerover', warm, { passive: true })
  document.addEventListener('focusin', warm)
  document.addEventListener('touchstart', warm, { passive: true })
}

/* Klikk på lenken til siden man allerede står på (f.eks. logoen på forsiden)
   skal ikke re-navigere. Dragen jigglier i stedet: «vi fikk touchen din,
   men du er allerede her». */
function initSamePageGuard(header) {
  header.querySelectorAll('.site-header__brand, nav a').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!isSameTabNavigation(event, link)) return
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
  initCaseWarmup()
  initAnimationInspector()
  initDesignAudit()


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

  syncVisibleMedia()
  return header
}
