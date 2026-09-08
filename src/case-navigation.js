// Featured sequence follows the homepage timeline; archived cases stay in the basement.
export const FEATURED_ORDER = ['micromilspec', 'hjemla', 'off-market', 'boligmappa', 'finn', 'nettavisen', 'uber']
export const ARCHIVED_ORDER = ['hmkg', 'humming-people', 'brathwait', 'mountain-milk']

export function caseNeighbors(caseId) {
  const archived = ARCHIVED_ORDER.includes(caseId)
  const order = archived ? ARCHIVED_ORDER : FEATURED_ORDER
  const index = order.indexOf(caseId)
  if (index === -1) return null
  return {
    archived,
    previous: order[(index + order.length - 1) % order.length],
    next: order[(index + 1) % order.length],
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
