import { sessionState } from './session-state.js'
import { animateProjectIntro } from './project-intro.js'

// Capture the selected image and visible neighbours independently. The update
// mounts the real case beneath them; the root never becomes a snapshot.
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
  let intro = { finished: Promise.resolve(), finish() {} }
  let skipped = false
  const neighbours = [...tile.closest('[data-timeline]').querySelectorAll('a.timeline-tile')]
    .filter(node => node !== tile)
    .map(node => ({ node, bounds: node.getBoundingClientRect() }))
    .filter(({ bounds }) => bounds.width > 0 && bounds.height > 0
      && bounds.right > 0 && bounds.left < innerWidth && bounds.bottom > 0 && bounds.top < innerHeight)
  const neighbourStyles = document.createElement('style')
  neighbourStyles.dataset.projectNeighbourStyles = ''
  neighbourStyles.textContent = neighbours.map(({ node, bounds }, index) => {
    const name = `project-neighbour-${index}`
    node.style.viewTransitionName = name
    const left = bounds.left + bounds.width / 2 < rect.left + rect.width / 2
    // Snapshot transforms retain the timeline's magnification. Convert the
    // distance to the edge into local coordinates, including clipped tiles.
    const distance = (left ? -bounds.right - 32 : innerWidth - bounds.left + 32) / (bounds.width / node.offsetWidth)
    return `html.project-reveal-active::view-transition-group(${name}) { animation: none; z-index: 0; }
      html.project-reveal-active::view-transition-old(${name}) {
        --project-neighbour-distance: ${distance}px;
        mix-blend-mode: normal;
        animation: project-neighbour-exit 540ms 40ms cubic-bezier(.4, 0, .2, 1) both;
      }`
  }).join('\n')
  document.head.append(neighbourStyles)
  image.style.viewTransitionName = 'project-thumbnail'
  image.dataset.projectRevealSource = ''
  const snapshotScale = rect.height / image.offsetHeight
  html.style.setProperty('--project-reveal-distance', `${(innerHeight - rect.top + 32) / snapshotScale}px`)
  html.classList.add('project-reveal-active')
  const clearSource = () => {
    image.style.viewTransitionName = ''
    delete image.dataset.projectRevealSource
    neighbours.forEach(({ node }) => { node.style.viewTransitionName = '' })
  }
  const transition = document.startViewTransition(() => {
    clearSource()
    update()
    if (!skipped) intro = animateProjectIntro(document.querySelector('[data-case-root]'))
    details = [...document.querySelectorAll('[data-layout="presentation"] + .case-below, body > .project-audio')]
  })
  const cleanup = () => {
    clearSource()
    neighbourStyles.remove()
    html.classList.remove('project-reveal-active')
    html.style.removeProperty('--project-reveal-distance')
    listeners.abort()
    // Begin only when the thumbnail has finished (or the user skips it),
    // keeping the intro readable and the notes dock out of the reveal.
    if (!reduced.matches) {
      details.filter(node => node.isConnected).forEach(node => {
        const media = node.matches('.case-below')
        // Individual translate preserves the media column's horizontal centring.
        const frames = media
          ? [{ opacity: 0, translate: '0 48px' }, { opacity: 1, translate: '0 0' }]
          : [{ opacity: 0 }, { opacity: 1 }]
        const fade = node.animate(frames, {
          duration: media ? 480 : 300, easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
        })
        fade.id = 'project-details-enter'
      })
    }
  }
  const skip = () => { skipped = true; intro.finish(); transition.skipTransition() }
  const cancel = event => {
    // Let Close sample the live displacement before stopping the opening,
    // including a touch tap or Escape while the thumbnail is still moving.
    if (event?.type === 'touchstart' && event.target.closest('.case-close')) return
    if (event?.type === 'keydown' && event.key === 'Escape' && !document.querySelector('dialog[open]')) return
    skip()
  }
  const options = { passive: true, signal: listeners.signal }
  for (const name of ['pagehide', 'wheel', 'touchstart', 'keydown']) window.addEventListener(name, cancel, options)
  const viewport = [innerWidth, innerHeight]
  window.addEventListener('resize', () => {
    if (innerWidth !== viewport[0] || innerHeight !== viewport[1]) cancel()
  }, options)
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel() }, options)
  reduced.addEventListener('change', cancel, options)
  transition.ready.catch(skip)
  const finished = transition.finished.then(() => intro.finished, () => intro.finish()).then(cleanup)
  return { ready: transition.ready, updateCallbackDone: transition.updateCallbackDone, finished, skipTransition: skip }
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
  const distance = Number.isFinite(fromTop) ? Math.max(0, Math.min(fromTop - rect.top, fullDistance)) : fullDistance * .6
  if (distance < 1) return null
  const duration = Math.max(160, 420 * Math.sqrt(distance / Math.max(1, fullDistance)))
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
