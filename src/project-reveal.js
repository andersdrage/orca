import { sessionState } from './session-state.js'

// A same-document transition captures just the clicked image. The update
// callback mounts the real case beneath it; the root never becomes a snapshot.
export function revealProject(tile, update, { animate = true } = {}) {
  const image = tile?.querySelector('img')
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const rect = image?.getBoundingClientRect()
  const eligible = animate && document.startViewTransition && !reduced.matches
    && sessionState.getItem('case:presentation') !== 'false'
    && image?.complete && image.naturalWidth && rect.width > 0 && rect.height > 0
    && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth
  if (!eligible) {
    update()
    return null
  }
  const html = document.documentElement
  const listeners = new AbortController()
  image.style.viewTransitionName = 'project-thumbnail'
  image.dataset.projectRevealSource = ''
  html.style.setProperty('--project-reveal-distance', `${innerHeight - rect.top + 32}px`)
  html.classList.add('project-reveal-active')
  const clearSource = () => {
    image.style.viewTransitionName = ''
    delete image.dataset.projectRevealSource
  }
  const transition = document.startViewTransition(() => {
    clearSource()
    update()
  })
  const cleanup = () => {
    clearSource()
    html.classList.remove('project-reveal-active')
    html.style.removeProperty('--project-reveal-distance')
    listeners.abort()
  }
  const cancel = () => { transition.skipTransition() }
  const options = { passive: true, signal: listeners.signal }
  for (const name of ['pagehide', 'wheel', 'touchstart', 'keydown']) window.addEventListener(name, cancel, options)
  const viewport = [innerWidth, innerHeight]
  window.addEventListener('resize', () => {
    if (innerWidth !== viewport[0] || innerHeight !== viewport[1]) cancel()
  }, options)
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel() }, options)
  reduced.addEventListener('change', cancel, options)
  transition.ready.catch(() => {})
  transition.finished.then(cleanup, cleanup)
  return transition
}
