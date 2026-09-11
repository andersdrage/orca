let initialized = false

// iOS browser toolbars can leave CSS viewport units and fixed layers using
// different heights. Give the world, camera and navigation one visible height.
export function initViewportHeight() {
  if (initialized) return
  initialized = true
  const viewport = window.visualViewport
  let frame = 0
  let previousHeight = 0

  const update = () => {
    frame = 0
    // Pinch zoom should magnify the existing layout, not resize the world.
    if (viewport && Math.abs(viewport.scale - 1) > 0.01) return
    const height = viewport?.height ?? window.innerHeight
    if (!Number.isFinite(height) || height <= 0 || Math.abs(height - previousHeight) < 0.5) return
    previousHeight = height
    document.documentElement.style.setProperty('--viewport-height', `${height}px`)
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update)
  }

  update()
  viewport?.addEventListener('resize', schedule, { passive: true })
  window.addEventListener('resize', schedule, { passive: true })
  window.addEventListener('pageshow', schedule)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) schedule()
  })
}
