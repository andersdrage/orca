/* FPS-måler nede til venstre: frames per sekund + verste frame-tid i vinduet
   (ms — 16,7 ms er 60 fps-budsjettet; én treg frame synes her selv om snittet
   ser fint ut). Rødner når det droppes frames. */

export function initFpsMeter() {
  const el = document.createElement('div')
  el.className = 'fps-meter'
  el.setAttribute('aria-hidden', 'true')
  document.body.append(el)

  let frames = 0
  let windowStart = performance.now()
  let previousFrame = windowStart
  let worstFrame = 0

  function tick(now) {
    requestAnimationFrame(tick)
    frames += 1
    worstFrame = Math.max(worstFrame, now - previousFrame)
    previousFrame = now

    if (now - windowStart >= 500) {
      const fps = Math.round((frames * 1000) / (now - windowStart))
      el.textContent = `${fps} fps · ${worstFrame.toFixed(1)} ms`
      el.classList.toggle('is-dropping', fps < 50)
      frames = 0
      worstFrame = 0
      windowStart = now
    }
  }
  requestAnimationFrame(tick)
}
