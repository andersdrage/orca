import { sessionState } from './session-state.js'

const HANDOFF_KEY = 'project:reveal'
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)')

function clearSource() {
  document.querySelectorAll('[data-project-reveal-source]').forEach(image => {
    image.style.viewTransitionName = ''
    delete image.dataset.projectRevealSource
  })
}
window.addEventListener('pageshow', clearSource)
// Only an explicit index thumbnail click opts into the reveal. Case exits and
// unrelated links remain ordinary navigation, including Back/Forward restores.
window.addEventListener('pageswap', event => {
  if (!document.querySelector('[data-project-reveal-source]')) event.viewTransition?.skipTransition()
})

export function rememberProjectReveal(tile) {
  clearSource()
  sessionState.setItem(HANDOFF_KEY, '')
  if (!('onpagereveal' in window) || reducedMotion().matches || sessionState.getItem('case:presentation') === 'false') return
  const image = tile.querySelector('img')
  if (!image?.complete || !image.naturalWidth) return
  const rect = image.getBoundingClientRect()
  if (rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth) return
  tile.style.setProperty('--project-click-transform', getComputedStyle(image).transform)
  image.style.viewTransitionName = 'project-thumbnail'
  image.dataset.projectRevealSource = ''
  sessionState.setItem(HANDOFF_KEY, JSON.stringify({
    path: new URL(tile.href).pathname,
    created: Date.now(),
    viewport: [innerWidth, innerHeight],
    top: rect.top,
  }))
}

export function initProjectReveal(root) {
  let saved
  try { saved = JSON.parse(sessionState.getItem(HANDOFF_KEY) || 'null') } catch { /* Optional hint. */ }
  sessionState.setItem(HANDOFF_KEY, '')
  let valid = Boolean(saved && root?.querySelector('[data-layout="presentation"]'))
  try {
    const from = new URL(window.navigation?.activation?.from?.url ?? document.referrer)
    const type = window.navigation?.activation?.navigationType
    valid &&= from.origin === location.origin && from.pathname === '/' && type !== 'reload' && type !== 'traverse'
      && saved.path === location.pathname && Date.now() - saved.created < 10000 && Date.now() >= saved.created
      && saved.viewport?.[0] === innerWidth && Math.abs(saved.viewport?.[1] - innerHeight) <= 80 && Number.isFinite(saved.top)
  } catch { valid = false }

  window.addEventListener('pagereveal', event => {
    const transition = event.viewTransition
    if (!transition) return
    if (!valid || reducedMotion().matches) return transition.skipTransition()
    valid = false
    const html = document.documentElement
    html.style.setProperty('--project-reveal-distance', `${innerHeight - saved.top + 32}px`)
    html.classList.add('project-reveal-active')
    const listeners = new AbortController()
    let finished = false
    const cleanup = () => {
      if (finished) return
      finished = true
      html.classList.remove('project-reveal-active')
      html.style.removeProperty('--project-reveal-distance')
      listeners.abort()
    }
    const cancel = () => { transition.skipTransition(); cleanup() }
    const options = { passive: true, signal: listeners.signal }
    for (const name of ['pagehide', 'wheel', 'touchstart', 'keydown']) window.addEventListener(name, cancel, options)
    const viewport = [innerWidth, innerHeight]
    window.addEventListener('resize', () => {
      // Mobile Safari can emit resize on arrival without changing the viewport.
      if (innerWidth !== viewport[0] || innerHeight !== viewport[1]) cancel()
    }, options)
    document.addEventListener('visibilitychange', () => { if (document.hidden) cancel() }, options)
    reducedMotion().addEventListener('change', cancel, options)
    transition.ready.catch(cancel)
    transition.finished.then(cleanup, cleanup)
  })
}
