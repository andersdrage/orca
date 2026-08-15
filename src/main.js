import { initHeader } from './header.js'
import { initTimeline } from './timeline.js'
import { NAV_VARIANTS, getNavVariant, setNavVariant } from './nav-variant.js'

initHeader()
initTimeline()

/* Transition-lab-bryter: velg hvilken About/Praise-overgang som testes.
   Valget lagres i localStorage og gjelder alle sider umiddelbart. */
function initVariantSwitcher() {
  const switcher = document.querySelector('[data-vt-switcher]')
  if (!switcher) return

  NAV_VARIANTS.forEach((variant) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'vt-switcher__option'
    button.textContent = variant.label
    button.dataset.variant = variant.id
    button.setAttribute('aria-pressed', String(variant.id === getNavVariant()))
    button.addEventListener('click', () => {
      setNavVariant(variant.id)
      switcher.querySelectorAll('.vt-switcher__option').forEach((other) => {
        other.setAttribute('aria-pressed', String(other === button))
      })
    })
    switcher.append(button)
  })
}

initVariantSwitcher()
