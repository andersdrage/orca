// Shared artwork for the archive intro and its homepage entry.
export function archiveCardContent(titleId = '') {
  return `<h2 class="archived-card__title"${titleId ? ` id="${titleId}"` : ''}>Work<br />archive</h2>
    <p class="archived-card__meta">Miscellaneous work <span class="archived-card__dates">(2012–Present)</span></p>`
}
