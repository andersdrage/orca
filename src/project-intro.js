// Measure the browser's actual balanced lines before wrapping them. Restore the
// original text after entry so selection, accessibility and resizing stay native.
export function animateProjectIntro(root) {
  const paragraph = root?.querySelector('[data-layout="presentation"] :is(.case-lead__intro, .case-legacy-intro)')
  const text = paragraph?.firstChild
  if (!text || text.nodeType !== Node.TEXT_NODE || paragraph.childNodes.length !== 1) {
    return { finished: Promise.resolve(), finish() {} }
  }
  const original = text.textContent
  const lines = []
  const range = document.createRange()
  for (let index = 0; index < original.length; index++) {
    range.setStart(text, index)
    range.setEnd(text, index + 1)
    const bounds = range.getBoundingClientRect()
    // Collapsed whitespace belongs to the preceding line, never a new line.
    if (!lines.length || (original[index].trim() && Math.abs(bounds.top - lines.at(-1).top) > 2)) {
      lines.push({ top: bounds.top, text: '' })
    }
    lines.at(-1).text += original[index]
  }
  const fragments = lines.map(line => {
    const span = document.createElement('span')
    span.className = 'project-intro-line'
    span.textContent = line.text
    return span
  })
  paragraph.replaceChildren(...fragments)
  const animations = fragments.map((span, index) => {
    const animation = span.animate([
      { opacity: 0, transform: 'translateY(18px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 440, delay: 320 + index * 100, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' })
    animation.id = 'project-intro-line'
    return animation
  })
  const block = root.querySelector('.case-title-block')
  if (block) {
    const animation = block.animate([
      { opacity: 0, transform: 'translateY(10px) scale(.98)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' },
    ], { duration: 320, delay: 320 + lines.length * 100, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' })
    animation.id = 'project-intro-block'
    animations.push(animation)
  }
  let restored = false
  const restore = () => {
    if (restored) return
    restored = true
    animations.forEach(animation => animation.cancel())
    paragraph.replaceChildren(text)
  }
  const finished = Promise.allSettled(animations.map(animation => animation.finished)).then(restore)
  return { finished, finish: restore }
}
