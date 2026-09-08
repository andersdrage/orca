// The intro stays behind the media; its opacity follows the actual overlap.
export function initCaseIntroScroll(lead) {
  const copy = lead.querySelector('.case-lead__copy, .case-legacy-copy')
  const content = lead.nextElementSibling
  if (!copy || !content?.children.length) return () => {}
  const section = lead.parentElement
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  let frame = 0

  function update() {
    frame = 0
    const enabled = lead.dataset.layout === 'presentation' && !reduced.matches
    section.classList.toggle('case-presentation-sticky', enabled)
    if (!enabled) {
      lead.style.removeProperty('--intro-opacity')
      lead.style.removeProperty('--intro-sticky-top')
      return
    }
    // Tall intros can scroll to their last line before they stick on small screens.
    lead.style.setProperty('--intro-sticky-top', `${Math.min(32, innerHeight - lead.offsetHeight)}px`)
    const text = copy.getBoundingClientRect()
    const media = content.getBoundingClientRect()
    const covered = Math.max(0, Math.min(1, (text.bottom - media.top) / Math.max(1, text.height)))
    lead.style.setProperty('--intro-opacity', String(1 - covered))
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update)
  }
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule, { passive: true })
  window.addEventListener('pageshow', schedule)
  reduced.addEventListener('change', schedule)
  const observer = new ResizeObserver(schedule)
  observer.observe(lead)
  observer.observe(copy)
  return schedule
}
