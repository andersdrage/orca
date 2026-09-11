// Opt-in opening experiment: /?navintro=1. The actual links travel, so they
// remain usable and keep their existing navigation and accessibility semantics.
export function createNavigationIntroPreview(home) {
  if (new URLSearchParams(location.search).get('navintro') !== '1' || matchMedia('(prefers-reduced-motion: reduce)').matches) return null
  const preview = document.createElement('div')
  preview.className = 'navigation-intro-preview'
  preview.setAttribute('aria-hidden', 'true')
  preview.innerHTML = ['Work', 'About', 'Timeline', 'People'].map(label => `<span>${label}</span>`).join('')
  home.append(preview)
  return preview
}

export function playNavigationIntro(header, preview) {
  if (new URLSearchParams(location.search).get('navintro') !== '1') return false
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    preview?.remove()
    return false
  }

  const body = document.body
  const links = [
    header.querySelector('nav a[href="/"]'),
    header.querySelector('nav a[href="/about/"]'),
    document.querySelector('.corner-links a[href="/timeline/"]'),
    document.querySelector('.corner-links a[href="/people/"]'),
  ]
  if (links.some(link => !link)) {
    preview?.remove()
    return false
  }

  body.classList.add('world-map-intro', 'nav-intro-running', 'nav-intro-preparing')
  const controller = new AbortController()
  const animations = []
  let timer
  let revealTimer
  let finished = false
  let revealed = false
  const reveal = () => {
    if (revealed) return
    revealed = true
    body.classList.remove('world-map-intro')
    body.dispatchEvent(new CustomEvent('world:map-intro-done'))
  }
  const finish = () => {
    if (finished) return
    finished = true
    clearTimeout(timer)
    clearTimeout(revealTimer)
    animations.forEach(animation => animation.cancel())
    links.forEach(link => link.style.removeProperty('transform'))
    body.classList.remove('nav-intro-running', 'nav-intro-preparing')
    body.classList.add('nav-intro-complete')
    controller.abort()
    reveal()
  }
  const listen = (target, type, callback, options = {}) => target.addEventListener(type, callback, { ...options, signal: controller.signal })
  listen(document, 'click', finish, { capture: true })
  listen(document, 'keydown', finish, { capture: true })
  listen(document, 'wheel', finish, { passive: true })
  listen(document, 'touchstart', event => {
    if (!event.target.closest('a')) finish()
  }, { passive: true })
  const initialViewport = [innerWidth, innerHeight]
  listen(window, 'resize', () => {
    if (innerWidth !== initialViewport[0] || innerHeight !== initialViewport[1]) finish()
  })
  listen(window, 'popstate', finish)
  listen(window, 'pagehide', finish)
  listen(matchMedia('(prefers-reduced-motion: reduce)'), 'change', finish)

  // Match the text already travelling inside the page before handing it to
  // the fixed navigation. Synchronous measurement avoids a blank handoff frame.
  {
    const previewRects = preview ? [...preview.children].map(label => {
      const range = document.createRange()
      range.selectNodeContents(label)
      return range.getBoundingClientRect()
    }) : []
    const viewportHeight = document.querySelector('.corner-links').getBoundingClientRect().height
    const left = innerWidth / 2 - Math.min(110, innerWidth * 0.22)
    const right = innerWidth - left
    links.forEach((link, index) => {
      const range = document.createRange()
      range.selectNodeContents(link)
      const text = range.getBoundingClientRect()
      const source = previewRects[index]
      const x = source ? source.left - text.left : index % 2 === 0 ? left - text.left : right - text.right
      const y = (source ? source.top + source.height / 2 : viewportHeight / 2 + (index < 2 ? -18 : 18)) - (text.top + text.height / 2)
      const resting = getComputedStyle(link).transform
      link.style.transform = `translate(${x}px, ${y}px)${resting === 'none' ? '' : ` ${resting}`}`
    })
    preview?.remove()
    body.classList.remove('nav-intro-preparing')
    timer = setTimeout(() => {
      if (finished) return
      // Give the links room to pass the mobile text column before it appears.
      revealTimer = setTimeout(reveal, 420)
      links.forEach(link => {
        const from = link.style.transform
        link.style.removeProperty('transform')
        const to = getComputedStyle(link).transform
        const animation = link.animate([{ transform: from }, { transform: to }], {
          duration: 760,
          easing: 'cubic-bezier(0.76, 0, 0.24, 1)',
          fill: 'backwards',
        })
        animations.push(animation)
      })
      Promise.all(animations.map(animation => animation.finished)).then(finish, finish)
    }, 100)
  }
  return true
}
