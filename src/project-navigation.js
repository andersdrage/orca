import { track } from '@vercel/analytics'
import { sessionState } from './session-state.js'
import { isCasePath } from './case-navigation.js'
import { isSameTabNavigation } from './link-navigation.js'
import { prepareProjectPage } from './project-page.js'
import { mountCase } from './case-view.js'
import { revealProject, returnProjectThumbnail } from './project-reveal.js'
import { syncVisibleMedia } from './visible-media.js'

const OVERVIEWS = ['/', '/about/', '/praise/', '/timeline/', '/people/', '/archived-work/']
let initialized = false

// LAN previews use HTTP: randomUUID is secure-context-only, while
// getRandomValues is also available on the phone's local network address.
function navigationKey() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('')
}

export function initProjectNavigation() {
  if (initialized) return
  initialized = true
  history.scrollRestoration = 'manual'
  const session = navigationKey()
  const hasWorld = Boolean(document.querySelector('.world'))
  let currentPath = location.pathname
  let referrerPath
  try { const referrer = new URL(document.referrer); if (referrer.origin === location.origin) referrerPath = referrer.pathname } catch {}
  let overview = OVERVIEWS.includes(currentPath) ? currentPath : history.state?.caseOverview ?? (OVERVIEWS.includes(referrerPath) ? referrerPath : '/')
  try {
    const pending = JSON.parse(sessionState.getItem('case:return') || 'null')
    if (!history.state?.caseOverview && pending?.from === referrerPath && pending?.to === currentPath && OVERVIEWS.includes(pending.overview)) overview = pending.overview
  } catch {}
  let overviewTitle = document.title
  let overviewMetadata = []
  let suspended = null
  let overviewScroll = []
  let layout = document.querySelector('[data-case-root]')?.closest('#site-layout')
  let disposeCase = null
  let transition = null
  let returningThumbnail = null
  let revision = 0
  let returnFocus = null
  let returnFocusWasKeyboard = false
  let pendingLink = null
  const caseScroll = new Map()
  let currentScrollKey = history.state?.projectView?.key ?? navigationKey()
  const metadata = () => [...document.head.querySelectorAll('meta[name="description"], meta[property^="og:"], meta[name^="twitter:"]')]
  const replaceMetadata = nodes => {
    metadata().forEach(node => node.remove())
    nodes.forEach(node => document.head.append(node.cloneNode(true)))
  }

  function stopTransition() {
    returningThumbnail?.cancel()
    returningThumbnail = null
    transition?.skipTransition()
    transition = null
  }
  function clearPending() {
    pendingLink?.removeAttribute('aria-busy')
    pendingLink = null
    window.dispatchEvent(new Event('project:navigation-settled'))
  }
  function suspendOverview() {
    if (suspended || !hasWorld) return
    overviewTitle = document.title
    overviewMetadata = metadata().map(node => node.cloneNode(true))
    overviewScroll = [...document.querySelectorAll('.world-page, [data-timeline]')].map(node => ({ node, left: node.scrollLeft, top: node.scrollTop }))
    suspended = document.createElement('div')
    suspended.className = 'project-overview-suspended'
    suspended.inert = true
    suspended.setAttribute('aria-hidden', 'true')
    // Preserve layout dimensions and scroll offsets while removing the world
    // from painting, hit testing, document overflow and accessibility.
    document.querySelectorAll('body > .world, body > .world-map-camera, body > .site-header, body > .corner-links, body > .skip-link').forEach(node => suspended.append(node))
    document.body.prepend(suspended)
    document.body.classList.remove('world-mode', 'page-home')
    overviewScroll.forEach(({ node, left, top }) => node.scrollTo({ left, top, behavior: 'instant' }))
  }
  function removeCase() {
    disposeCase?.()
    disposeCase = null
    layout?.remove()
    layout = null
    document.querySelector('[data-project-skip]')?.remove()
  }
  function restoreOverview({ animate = false } = {}) {
    let fromTop
    if (animate && document.documentElement.classList.contains('project-reveal-active')) {
      const transform = getComputedStyle(document.documentElement, '::view-transition-old(project-thumbnail)').transform
      if (transform !== 'none') {
        const groupStyle = getComputedStyle(document.documentElement, '::view-transition-group(project-thumbnail)')
        const group = new DOMMatrixReadOnly(groupStyle.transform)
        const image = new DOMMatrixReadOnly(transform)
        const [originX, originY] = groupStyle.transformOrigin.split(' ').map(value => parseFloat(value) || 0)
        // Native snapshots preserve the tile's magnification around its origin.
        fromTop = group.m42 + group.b * (image.m41 - originX) + group.d * (image.m42 - originY) + originY
      }
    }
    ++revision
    stopTransition()
    clearPending()
    removeCase()
    delete document.body.dataset.caseTheme
    document.body.classList.remove('page-case')
    if (suspended) {
      overviewScroll = overviewScroll.map(({ node }) => ({ node, left: node.scrollLeft, top: node.scrollTop }))
      suspended.replaceWith(...suspended.childNodes)
      suspended = null
    }
    document.body.classList.add('world-mode')
    document.body.classList.toggle('page-home', location.pathname === '/')
    overviewScroll.forEach(({ node, left, top }) => node.scrollTo({ left, top, behavior: 'instant' }))
    window.dispatchEvent(new Event('project:overview-restored'))
    document.title = overviewTitle
    replaceMetadata(overviewMetadata)
    window.scrollTo({ top: 0, behavior: 'instant' })
    currentPath = location.pathname
    syncVisibleMedia()
    if (location.pathname === overview && returnFocus?.isConnected) {
      if (returnFocus.matches('a.timeline-tile')) returnFocus.classList.toggle('is-pointer-return', !returnFocusWasKeyboard)
      returnFocus.focus({ preventScroll: true })
    }
    else document.querySelector(`.world-page[data-path="${location.pathname}"] main`)?.focus({ preventScroll: true })
    if (animate && location.pathname === '/' && returnFocus?.matches('a.timeline-tile')) {
      returningThumbnail = returnProjectThumbnail(returnFocus, { fromTop })
    }
  }
  function close() {
    const entry = history.state?.projectView
    if (hasWorld && entry?.session === session && entry.depth > 0) history.go(-entry.depth)
    else location.assign(overview)
  }
  function activateCase(root) {
    document.body.dataset.caseTheme = root.dataset.caseId
    disposeCase = mountCase(root, { overview, navigate: href => navigate(href, { animate: false }), close })
    const header = layout.querySelector('.site-header')
    const updateHeader = () => header?.classList.toggle('is-scrolled', scrollY > 8)
    const cleanup = disposeCase
    window.addEventListener('scroll', updateHeader, { passive: true })
    disposeCase = () => { window.removeEventListener('scroll', updateHeader); cleanup() }
    updateHeader()
    syncVisibleMedia(root)
  }

  async function navigate(href, { tile = null, animate = false, push = true, trigger = null, keyboard = false } = {}) {
    const url = new URL(href, location.href)
    // Count deliberate selections, including keyboard navigation, but not
    // direct visits, preloading, or Back/Forward restoration. Keep to Pro's two properties.
    if (push) track('Case clicked', { case: url.pathname.replaceAll('/', ''), source: location.pathname })
    const request = ++revision
    const previousTransition = transition
    stopTransition()
    clearPending()
    pendingLink = trigger
    pendingLink?.setAttribute('aria-busy', 'true')
    if (!layout) {
      currentPath = document.querySelector('.world-page:not([inert])')?.dataset.path ?? currentPath
      overview = currentPath
    }
    else caseScroll.set(currentScrollKey, scrollY)
    try {
      const [doc] = await Promise.all([prepareProjectPage(url.href), previousTransition?.finished.catch(() => {})])
      // These two fonts draw the intro and title block. Fonts are prepared
      // before capture, so the browser never holds a snapshot waiting for them.
      await Promise.race([Promise.all([document.fonts.load('16px DragePlantin'), document.fonts.load('10px PPSupplyMono')]).catch(() => {}), new Promise(resolve => setTimeout(resolve, 1500))])
      if (request !== revision) return
      const incoming = doc.querySelector('#site-layout').cloneNode(true)
      const root = incoming.querySelector('[data-case-root]')
      const fromOverview = !isCasePath(currentPath)
      const depth = fromOverview ? 1 : (history.state?.projectView?.depth ?? 0) + 1
      const update = () => {
        if (request !== revision) return
        if (fromOverview) { returnFocus = trigger ?? document.activeElement; returnFocusWasKeyboard = keyboard; suspendOverview() }
        removeCase()
        currentScrollKey = push ? navigationKey() : history.state?.projectView?.key ?? navigationKey()
        if (push) history.pushState({ caseOverview: overview, projectView: { session, depth, key: currentScrollKey } }, '', url.pathname)
        else overview = history.state?.caseOverview ?? overview
        currentPath = url.pathname
        document.body.classList.add('page-case')
        document.title = doc.title
        replaceMetadata([...doc.head.querySelectorAll('meta[name="description"], meta[property^="og:"], meta[name^="twitter:"]')])
        layout = incoming
        const skip = document.createElement('a')
        skip.href = '#work'; skip.className = 'skip-link'; skip.textContent = 'Skip to work'; skip.dataset.projectSkip = ''
        document.body.append(skip, layout)
        activateCase(root)
        window.scrollTo({ top: push ? 0 : caseScroll.get(currentScrollKey) ?? 0, behavior: 'instant' })
        const main = layout.querySelector('main')
        main.tabIndex = -1
        main.focus({ preventScroll: true })
        clearPending()
      }
      transition = revealProject(fromOverview ? tile : null, update, { animate })
      // Always handle update errors even when native transition painting skips.
      transition?.updateCallbackDone.catch(() => { if (request === revision) location.assign(url.href) })
    } catch {
      if (request !== revision) return
      clearPending()
      // A failed fetch or unsupported environment still has a real project URL.
      sessionState.setItem('case:return', JSON.stringify({ from: currentPath, to: url.pathname, overview }))
      location.assign(url.href)
    }
  }

  if (layout) {
    history.replaceState({ ...history.state, caseOverview: overview }, '')
    const skip = document.querySelector('body > .skip-link')
    if (skip) skip.dataset.projectSkip = ''
    activateCase(layout.querySelector('[data-case-root]'))
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]')
    if (!isSameTabNavigation(event, link)) return
    if (isCasePath(link.pathname)) {
      event.preventDefault()
      navigate(link.href, { tile: link.matches('a.timeline-tile') ? link : null, animate: event.detail > 0, trigger: link, keyboard: event.detail === 0 })
    } else if (layout && hasWorld && OVERVIEWS.includes(link.pathname)) {
      event.preventDefault()
      if (link.pathname === overview) close()
      else {
        history.pushState({}, '', link.pathname)
        restoreOverview()
        window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }))
      }
    }
  })
  window.addEventListener('popstate', event => {
    if (isCasePath(location.pathname)) {
      navigate(location.href, { push: false })
    } else if (hasWorld && suspended) {
      if (layout) caseScroll.set(currentScrollKey, scrollY)
      // A trackpad swipe may already have animated the browser's snapshot.
      restoreOverview({ animate: !event.hasUAVisualTransition })
    } else {
      // Forward restoration has no trigger link. Back must still invalidate
      // its pending fetch/font work, or it can remount a case over the overview.
      ++revision
      stopTransition()
      clearPending()
      currentPath = location.pathname
    }
  }, { capture: true })
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && pendingLink && !layout) { ++revision; clearPending() }
  })
  window.addEventListener('pagehide', () => { ++revision; stopTransition(); clearPending() })
}
