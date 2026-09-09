export function initCaseComparisons(root, { signal } = {}) {
  root.querySelectorAll('[data-case-comparison]').forEach((frame) => {
    const slider = frame.querySelector('input')
    const before = frame.querySelector('.case-comparison__before')
    const divider = frame.querySelector('.case-comparison__divider')
    const images = [...frame.querySelectorAll('img')]
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let animations = []
    let visible = false
    let preparing = false
    let demonstrated = false
    let interacted = false
    let pointer = null

    function render(value) {
      value = Math.max(0, Math.min(100, value))
      slider.value = String(Math.round(value))
      slider.setAttribute('aria-valuetext', `${Math.round(value)}% before, ${100 - Math.round(value)}% after`)
      before.style.clipPath = `inset(0 ${100 - value}% 0 0)`
      divider.style.transform = `translateX(${value}%)`
    }

    function stopDemo(reset = false) {
      if (!animations.length) return
      // Keep the current reveal when a visitor takes over mid-demonstration.
      const rightInset = getComputedStyle(before).clipPath.match(/^inset\(\S+\s+([\d.]+)%/)
      const value = reset ? 50 : rightInset ? 100 - Number(rightInset[1]) : Number(slider.value)
      animations.forEach(animation => animation.cancel())
      animations = []
      render(value)
    }

    function takeOver() {
      interacted = true
      stopDemo()
    }

    async function demonstrate() {
      if (!visible || preparing || demonstrated || interacted || reduced.matches || document.hidden) return
      preparing = true
      // Decode before moving so the first reveal never sweeps across an empty image.
      images.forEach(image => { image.loading = 'eager' })
      try { await Promise.all(images.map(image => image.decode())) }
      catch { return }
      finally { preparing = false }
      if (signal?.aborted || !visible || interacted || reduced.matches || document.hidden) return
      demonstrated = true
      const stops = [50, 70, 30, 50]
      const offsets = [0, 0.25, 0.7, 1]
      const timing = { duration: 1800, delay: 200, fill: 'both', easing: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)' }
      const run = [
        before.animate(stops.map((value, i) => ({ clipPath: `inset(0 ${100 - value}% 0 0)`, offset: offsets[i] })), timing),
        divider.animate(stops.map((value, i) => ({ transform: `translateX(${value}%)`, offset: offsets[i] })), timing),
      ]
      run.forEach(animation => { animation.id = 'comparison-demonstration' })
      animations = run
      Promise.all(run.map(animation => animation.finished)).then(() => {
        if (animations === run) stopDemo(true)
      }, () => {})
    }

    function positionFromPointer(event) {
      const bounds = frame.getBoundingClientRect()
      if (bounds.width) render((event.clientX - bounds.left) / bounds.width * 100)
    }

    slider.addEventListener('pointerdown', (event) => {
      if (!event.isPrimary || event.button !== 0 || pointer !== null) return
      event.preventDefault()
      takeOver()
      slider.focus({ preventScroll: true })
      pointer = event.pointerId
      slider.setPointerCapture(pointer)
      positionFromPointer(event)
    })
    slider.addEventListener('pointermove', (event) => {
      if (event.pointerId === pointer) positionFromPointer(event)
    })
    slider.addEventListener('pointerup', (event) => {
      if (event.pointerId !== pointer) return
      positionFromPointer(event)
      slider.releasePointerCapture(pointer)
      pointer = null
    })
    slider.addEventListener('pointercancel', () => { pointer = null })
    slider.addEventListener('lostpointercapture', () => { pointer = null })
    slider.addEventListener('focus', takeOver)
    slider.addEventListener('keydown', (event) => {
      takeOver()
      // The native range handles these keys; case navigation must not also run.
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) event.stopPropagation()
    })
    slider.addEventListener('input', () => {
      const value = Number(slider.value)
      takeOver()
      render(value)
    })

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.45
      if (visible) demonstrate()
      else stopDemo(true)
    }, { threshold: [0, 0.45] })
    observer.observe(frame)
    reduced.addEventListener('change', () => {
      if (reduced.matches) stopDemo(true)
      else demonstrate()
    }, { signal })
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopDemo(true)
      else demonstrate()
    }, { signal })
    signal?.addEventListener('abort', () => { visible = false; observer.disconnect(); stopDemo(true) }, { once: true })
    render(50)
  })
}
