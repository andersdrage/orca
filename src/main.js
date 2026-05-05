import { initHeader } from './header.js'
import { buildPortfolioHtml } from './portfolio-render.js'

const root = document.querySelector('[data-portfolio-root]')
if (root) {
  root.innerHTML = buildPortfolioHtml()
}

const header = initHeader()
const stickyTitle = document.querySelector('[data-sticky-work-title]')
const portfolioSections = [...document.querySelectorAll('#work section[aria-labelledby]')]

function updateStickyWorkTitle() {
  if (!header || !stickyTitle || portfolioSections.length === 0) return

  const headerBottom = header.getBoundingClientRect().bottom
  const activeSection = portfolioSections.find((section) => {
    const title = document.getElementById(section.getAttribute('aria-labelledby') ?? '')
    if (!title) return false

    const titleTop = title.getBoundingClientRect().top
    const sectionBottom = section.getBoundingClientRect().bottom
    return titleTop <= headerBottom && sectionBottom > headerBottom
  })

  if (activeSection) {
    const title = document.getElementById(activeSection.getAttribute('aria-labelledby') ?? '')
    stickyTitle.textContent = title?.textContent?.trim() ?? ''
  }

  stickyTitle.classList.toggle('is-visible', Boolean(activeSection))
}

if (header && stickyTitle) {
  updateStickyWorkTitle()
  window.addEventListener('scroll', updateStickyWorkTitle, { passive: true })
  window.addEventListener('resize', updateStickyWorkTitle)
}
