export function initCaseGallery(root) {
  const images = [...root.querySelectorAll('[data-case-image]')]
  if (!images.length) return

  const dialog = document.createElement('dialog')
  dialog.className = 'case-image-viewer'
  dialog.setAttribute('aria-label', 'Uber website pages')
  dialog.innerHTML = `<div class="case-image-viewer__toolbar">
    <button type="button" data-previous aria-label="Previous image">←</button>
    <p role="status" aria-live="polite" aria-atomic="true"></p>
    <button type="button" data-next aria-label="Next image">→</button>
    <button type="button" data-close aria-label="Close image viewer" autofocus>×</button>
  </div><div class="case-image-viewer__scroll" tabindex="0" aria-label="Enlarged image; scroll to explore"><img alt="" /></div>`
  document.body.append(dialog)
  const scroll = dialog.querySelector('.case-image-viewer__scroll')
  const image = scroll.querySelector('img')
  const close = dialog.querySelector('[data-close]')
  let index = 0
  let trigger
  let previousOverflow

  function show(next) {
    index = (next + images.length) % images.length
    const source = images[index]
    const thumbnail = source.querySelector('img')
    image.alt = `Uber — ${source.dataset.imageLabel}`
    image.width = Number(thumbnail.getAttribute('width'))
    image.height = Number(thumbnail.getAttribute('height'))
    image.src = source.dataset.caseImage
    dialog.querySelector('[role="status"]').textContent = `${source.dataset.imageLabel} · ${index + 1} / ${images.length}`
    scroll.scrollTop = 0
  }

  images.forEach((button, i) => button.addEventListener('click', () => {
    trigger = button
    show(i)
    previousOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    dialog.showModal()
    close.focus({ preventScroll: true })
  }))
  function closeViewer() {
    dialog.close()
    document.documentElement.style.overflow = previousOverflow
    image.removeAttribute('src')
    trigger?.focus({ preventScroll: true })
  }
  close.addEventListener('click', closeViewer)
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault()
    closeViewer()
  })
  dialog.querySelector('[data-previous]').addEventListener('click', () => show(index - 1))
  dialog.querySelector('[data-next]').addEventListener('click', () => show(index + 1))
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') event.stopPropagation()
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      event.stopPropagation()
      show(index + (event.key === 'ArrowLeft' ? -1 : 1))
    }
  })
  return () => {
    if (dialog.open) { dialog.close(); document.documentElement.style.overflow = previousOverflow }
    dialog.remove()
  }
}
