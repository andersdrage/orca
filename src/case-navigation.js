// Shared by thumbnail order, case arrows and return-transition detection.
export const FEATURED_ORDER = ['micromilspec', 'hjemla', 'off-market', 'houeland', 'boligmappa', 'nettavisen', 'finn', 'uber']

export const isCasePath = pathname => FEATURED_ORDER.some(id => pathname === `/${id}/` || pathname === `/${id}`)

export function caseNeighbors(caseId) {
  const index = FEATURED_ORDER.indexOf(caseId)
  if (index === -1) return null
  return {
    previous: FEATURED_ORDER[(index + FEATURED_ORDER.length - 1) % FEATURED_ORDER.length],
    next: FEATURED_ORDER[(index + 1) % FEATURED_ORDER.length],
  }
}

export function caseArrowDirection(event, modalOpen = false) {
  if (modalOpen || event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return null
  if (event.target?.isContentEditable || event.target?.closest?.(
    'input, textarea, select, [contenteditable]:not([contenteditable="false"]), audio[controls], video[controls], [role="tab"], [role="tablist"], [role="slider"], [role="spinbutton"], [role="textbox"], [role="combobox"], [role="listbox"], [role="menu"], [role="tree"]',
  )) return null
  if (event.key === 'ArrowLeft') return 'previous'
  if (event.key === 'ArrowRight') return 'next'
  return null
}
