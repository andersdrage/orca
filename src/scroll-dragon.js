const COUNT = 120
const frameUrl = index => `/images/dragon-scroll/frame-${String(index).padStart(3, '0')}.png`
const frames = []
let loading

function loadFrames() {
  if (loading) return loading
  loading = (async () => {
    let next = 0
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (next < COUNT) {
        const index = next++
        const image = new Image()
        image.decoding = 'async'
        image.src = frameUrl(index)
        try { await image.decode(); frames[index] = image } catch { /* Keep the still if a frame is unavailable. */ }
      }
    }))
  })()
  return loading
}

export function initScrollDragons() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const footers = new Map()
  let phase = 0, velocity = 0, raf = 0, lastTime = 0, lastInput = 0, touchY = null
  const scrollPositions = new WeakMap()
  const allowed = () => !reduced.matches && !document.hidden && !navigator.connection?.saveData
  const active = state => state.visible && !state.footer.closest('[inert]') && !document.body.classList.contains('world-map-intro')
  const draw = () => {
    const index = ((Math.floor(phase) % COUNT) + COUNT) % COUNT
    if (!frames[index]) return
    footers.forEach(state => {
      if (!active(state) || state.index === index) return
      state.context.clearRect(0, 0, 320, 320)
      state.context.drawImage(frames[index], 0, 0, 320, 320)
      state.canvas.hidden = false
      state.still.hidden = true
      state.canvas.dataset.frame = String(index)
      state.index = index
    })
  }
  const tick = now => {
    raf = 0
    if (!allowed()) { velocity = 0; return }
    const dt = Math.min((now - lastTime) / 1000, .05)
    lastTime = now
    phase = (phase + velocity * dt) % COUNT
    velocity *= Math.exp(-1.15 * dt)
    draw()
    if (Math.abs(velocity) > .3) raf = requestAnimationFrame(tick)
    else velocity = 0
  }
  const kick = delta => {
    if (!allowed() || !Number.isFinite(delta) || !delta) return
    // A strong flick carries several turns; reversing the gesture reverses spin.
    const impulse = Math.max(-160, Math.min(160, delta)) * .6
    velocity = Math.sign(impulse) !== Math.sign(velocity) ? impulse : Math.max(-200, Math.min(200, velocity + impulse))
    if (!raf) { lastTime = performance.now(); raf = requestAnimationFrame(tick) }
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      const state = footers.get(target)
      state.visible = isIntersecting
      if (isIntersecting && !target.closest('[inert]') && allowed()) loadFrames().then(draw)
    })
    draw()
  }, { rootMargin: '200px' })

  const scan = () => {
    document.querySelectorAll('.site-footer').forEach(footer => {
      if (footers.has(footer)) return
      const figure = footer.querySelector('.site-footer__dragon')
      const still = figure?.querySelector('img')
      if (!still) return
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 320
      canvas.hidden = true
      const context = canvas.getContext('2d')
      if (!context) return
      figure.append(canvas)
      footers.set(footer, { footer, still, canvas, context, visible: false, index: -1 })
      observer.observe(footer)
    })
    if (allowed() && [...footers.values()].some(active)) loadFrames().then(draw)
  }
  scan()
  // The overview mounts sibling footers after their documents arrive.
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['inert'] })
  document.addEventListener('wheel', event => {
    if (event.ctrlKey || event.target.closest('dialog, [data-case-comparison]')) return
    lastInput = performance.now()
    kick((Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1))
  }, { passive: true })
  document.addEventListener('touchstart', event => { touchY = event.touches.length === 1 ? event.touches[0].clientY : null }, { passive: true })
  document.addEventListener('touchmove', event => {
    if (touchY === null || event.touches.length !== 1 || event.target.closest('dialog')) return
    const y = event.touches[0].clientY
    lastInput = performance.now()
    kick(touchY - y)
    touchY = y
  }, { passive: true })
  document.addEventListener('touchend', () => { touchY = null }, { passive: true })
  document.addEventListener('touchcancel', () => { touchY = null }, { passive: true })
  document.addEventListener('scroll', event => {
    const scroller = event.target === document ? document.scrollingElement : event.target
    if (!(scroller instanceof Element) || scroller.closest('dialog')) return
    const top = scroller.scrollTop
    const previous = scrollPositions.get(scroller) ?? 0
    scrollPositions.set(scroller, top)
    if (performance.now() - lastInput > 120) kick(top - previous)
  }, { capture: true, passive: true })
  const stop = () => { cancelAnimationFrame(raf); raf = 0; velocity = 0 }
  reduced.addEventListener('change', () => { stop(); scan() })
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else scan() })
  window.addEventListener('pagehide', stop)
  window.addEventListener('pageshow', scan)
}
