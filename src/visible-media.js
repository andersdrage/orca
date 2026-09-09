const media = new Set()
const observed = new WeakSet()
const playback = new WeakMap()
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
const margin = 600
let scheduled = false

function active(el) {
  return !document.hidden && !document.prerendering && !el.closest('[inert], [hidden]')
}

function near(el, inset = 0) {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0 && r.bottom > -inset && r.top < innerHeight + inset && r.right > -inset && r.left < innerWidth + inset
}

function update(el) {
  const available = active(el)
  // Inactive pages can contain hundreds of items. They need neither layout
  // queries nor repeated pause() calls during the active page's animation.
  if (!available) {
    if (el.tagName === 'VIDEO' && !el.paused) el.pause()
    return
  }
  const nearby = available && near(el, margin)
  if (nearby && el.dataset.mediaPoster) {
    el.poster = el.dataset.mediaPoster
    delete el.dataset.mediaPoster
  }
  if (el.tagName === 'IMG') {
    if (nearby && !el.hasAttribute('src')) {
      el.loading = 'eager'
      el.src = el.dataset.mediaSrc
      observer.unobserve(el)
      media.delete(el)
    }
    return
  }
  const choice = playback.get(el)
  const permitted = choice?.intent === 'play' || (!reduced.matches && choice?.intent !== 'pause')
  const play = available && near(el) && permitted
  if (!play) { if (!el.paused) el.pause(); return }
  if (!el.hasAttribute('src')) {
    el.muted = true
    el.src = el.dataset.mediaSrc
  }
  if (el.paused && !choice?.pending) {
    if (choice) choice.pending = true
    el.play().catch(() => {
      if (choice) {
        choice.intent = 'pause'
        choice.button.textContent = 'Try video again'
      }
    }).finally(() => { if (choice) choice.pending = false })
  }
}

const observer = new IntersectionObserver((entries) => entries.forEach(({ target }) => update(target)), { rootMargin: `${margin}px` })

export function syncVisibleMedia(root = document) {
  root.querySelectorAll('[data-media-src]').forEach((el) => {
    if (!observed.has(el)) {
      observed.add(el)
      media.add(el)
      if (el.hasAttribute('data-media-controls')) addPlaybackControl(el)
      observer.observe(el)
    }
  })
  updateRegisteredMedia()
}

function updateRegisteredMedia() {
  media.forEach((el) => {
    if (!el.isConnected) {
      if (el.tagName === 'VIDEO') el.pause()
      observer.unobserve(el)
      media.delete(el)
    }
    else update(el)
  })
}

function schedule() {
  if (scheduled) return
  scheduled = true
  requestAnimationFrame(() => { scheduled = false; updateRegisteredMedia() })
}
document.addEventListener('scroll', schedule, { capture: true, passive: true })
window.addEventListener('resize', schedule)
document.addEventListener('visibilitychange', () => syncVisibleMedia())
document.addEventListener('prerenderingchange', () => syncVisibleMedia())
window.addEventListener('pageshow', () => syncVisibleMedia())
window.addEventListener('pageswap', () => media.forEach((el) => { if (el.tagName === 'VIDEO') el.pause() }))
reduced.addEventListener('change', () => {
  media.forEach((el) => {
    const choice = playback.get(el)
    // A new request for less motion stops even intentionally started playback.
    if (choice && reduced.matches) choice.intent = 'pause'
  })
  syncVisibleMedia()
})

function addPlaybackControl(video) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'media-playback'
  button.textContent = 'Play video'
  const choice = { intent: null, pending: false, button }
  playback.set(video, choice)
  const label = () => { button.textContent = video.paused ? 'Play video' : 'Pause video' }
  video.addEventListener('play', label)
  video.addEventListener('pause', label)
  button.addEventListener('click', () => {
    choice.intent = video.paused && !choice.pending ? 'play' : 'pause'
    update(video)
  })
  video.after(button)
}
