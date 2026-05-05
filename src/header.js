export function initHeader() {
  const header = document.querySelector('.site-header')
  if (!header) return null

  function updateHeaderScrollState() {
    header.classList.toggle('is-scrolled', window.scrollY > 8)
  }

  updateHeaderScrollState()
  window.addEventListener('scroll', updateHeaderScrollState, { passive: true })

  return header
}
