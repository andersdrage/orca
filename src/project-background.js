import { projectColors } from './project-colors.js'
import { lightThumbnailColor } from './project-color.js'
import { sessionState } from './session-state.js'
import { isSameTabNavigation } from './link-navigation.js'

const DEFAULT = '#fafafa'
const sampled = new WeakMap()
function sample(image) {
  if (!image?.complete || !image.naturalWidth) return null
  const source = image.currentSrc || image.src
  if (sampled.get(image)?.source === source) return sampled.get(image).color
  try {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const context = canvas.getContext('2d', { willReadFrequently: true })
    context.drawImage(image, 0, 0, 64, 64)
    const color = lightThumbnailColor(context.getImageData(0, 0, 64, 64).data)
    sampled.set(image, { source, color })
    return color
  } catch { return null }
}

export function initProjectBackground() {
  const html = document.documentElement
  const id = document.querySelector('[data-case-id]')?.dataset.caseId
  let color = projectColors[id] ?? DEFAULT
  let pending
  try { pending = JSON.parse(sessionState.getItem('project:background')) } catch { /* Direct visit. */ }
  sessionState.removeItem('project:background')
  if (pending?.to === location.pathname && Date.now() - pending.time < 10000 && /^#[0-9a-f]{6}$/i.test(pending.color)) color = pending.color
  else pending = null
  html.style.setProperty('--page-bg', color)
  html.style.setProperty('--previous-page-bg', pending?.from ?? DEFAULT)

  // Native document transitions blend the old and new page surfaces. Browsers
  // without them get the same color interpolation on the actual page instead.
  if (pending && !('onpagereveal' in window) && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    html.animate([{ '--page-bg': pending.from }, { '--page-bg': color }], {
      duration: 650, easing: 'cubic-bezier(.45, .05, .55, .95)',
    })
  }
  const warm = event => {
    const image = event.target.closest('.timeline-tile')?.querySelector('img')
    if (image) sample(image)
  }
  document.addEventListener('pointerover', warm, { passive: true })
  document.addEventListener('focusin', warm)
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]')
    if (!isSameTabNavigation(event, link) || link.origin !== location.origin) return
    const destination = link.pathname.split('/').filter(Boolean)[0]
    if (!projectColors[destination] && link.pathname !== '/') return
    const tint = sample(link.querySelector('.timeline-tile__image')) ?? projectColors[destination] ?? DEFAULT
    sessionState.setItem('project:background', JSON.stringify({
      to: link.pathname, color: tint, from: getComputedStyle(html).getPropertyValue('--page-bg').trim() || DEFAULT, time: Date.now(),
    }))
  })
}
