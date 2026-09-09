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
  let details = []
  image.style.viewTransitionName = 'project-thumbnail'
  image.dataset.projectRevealSource = ''
  const snapshotScale = rect.height / image.offsetHeight
  html.style.setProperty('--project-reveal-distance', `${(innerHeight - rect.top + 32) / snapshotScale}px`)
  html.classList.add('project-reveal-active')
  const clearSource = () => {
    image.style.viewTransitionName = ''
    delete image.dataset.projectRevealSource
  }
  const transition = document.startViewTransition(() => {
    clearSource()
    update()
    details = [...document.querySelectorAll('[data-layout="presentation"] + .case-below, body > .project-audio')]
  })
  const cleanup = () => {
    clearSource()
    html.classList.remove('project-reveal-active')
    html.style.removeProperty('--project-reveal-distance')
    listeners.abort()
    // Begin only when the thumbnail has finished (or the user skips it),
    // keeping the intro readable and the notes dock out of the reveal.
    if (!reduced.matches) {
      details.filter(node => node.isConnected).forEach(node => {
        const fade = node.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 300, easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
        })
        fade.id = 'project-details-enter'
      })
    }
  }
  const cancel = event => {
    // Let Close sample the live displacement before stopping the opening,
    // including a touch tap or Escape while the thumbnail is still moving.
    if (event?.type === 'touchstart' && event.target.closest('.case-close')) return
    if (event?.type === 'keydown' && event.key === 'Escape' && !document.querySelector('dialog[open]')) return
    transition.skipTransition()
  }
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

// Closing restores the live index immediately. Animate its real image so the
// rest of the page stays interactive, even when the opening was interrupted.
export function returnProjectThumbnail(tile, { fromTop } = {}) {
  const image = tile?.querySelector('img')
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  if (!image?.complete || !image.naturalWidth || reduced.matches) return null
  const rect = image.getBoundingClientRect()
  if (!rect.width || !rect.height || rect.right <= 0 || rect.left >= innerWidth) return null
  const restingTransform = getComputedStyle(image).transform
  const ownScale = Math.abs(new DOMMatrixReadOnly(restingTransform).d) || 1
  // The timeline magnifies the parent tile. Convert viewport travel to local
  // coordinates so the returning image lands exactly at its original size.
  const parentScale = rect.height / image.offsetHeight / ownScale
  const fullDistance = Math.max(0, innerHeight - rect.top + 32)
  const distance = Number.isFinite(fromTop) ? Math.max(0, Math.min(fromTop - rect.top, fullDistance)) : fullDistance
  if (distance < 1) return null
  const duration = Math.max(180, 480 * Math.sqrt(distance / Math.max(1, fullDistance)))
  const base = restingTransform === 'none' ? '' : ` ${restingTransform}`
  const animation = image.animate([
    { transform: `translateY(${distance / parentScale}px)${base}` },
    { transform: restingTransform },
  ], { duration, easing: 'cubic-bezier(0.32, 0.08, 0.24, 1)', fill: 'both' })
  animation.id = 'project-thumbnail-return'
  const listeners = new AbortController()
  const cancel = () => animation.cancel()
  const options = { passive: true, signal: listeners.signal }
  for (const name of ['pagehide', 'wheel', 'touchstart', 'keydown']) window.addEventListener(name, cancel, options)
  const viewport = [innerWidth, innerHeight]
  window.addEventListener('resize', () => {
    if (innerWidth !== viewport[0] || innerHeight !== viewport[1]) cancel()
  }, options)
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel() }, options)
  reduced.addEventListener('change', cancel, options)
  const cleanup = () => { listeners.abort(); animation.cancel() }
  animation.finished.then(cleanup, cleanup)
  return animation
}
