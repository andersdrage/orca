/* Transition-lab: hvilken About/Praise-overgang testes akkurat nå.
   Velges i bryteren nederst på forsiden; leses av alle sider via localStorage. */

const STORAGE_KEY = 'nav-vt-variant'

export const NAV_VARIANTS = [
  { id: 'pan', label: 'Pan' },
  { id: 'portal', label: 'Portal' },
  { id: 'title', label: 'Title' },
  { id: 'editorial', label: 'Reveal' },
  { id: 'spa', label: 'SPA' },
]

export function getNavVariant() {
  const stored = localStorage.getItem(STORAGE_KEY)
  return NAV_VARIANTS.some((variant) => variant.id === stored) ? stored : 'pan'
}

export function setNavVariant(id) {
  localStorage.setItem(STORAGE_KEY, id)
  document.documentElement.dataset.navVariant = id
}

export function applyNavVariantAttribute() {
  document.documentElement.dataset.navVariant = getNavVariant()
}
