const header = document.querySelector('.site-header')

function updateHeaderScrollState() {
  header?.classList.toggle('is-scrolled', window.scrollY > 8)
}

if (header) {
  updateHeaderScrollState()
  window.addEventListener('scroll', updateHeaderScrollState, { passive: true })
}
