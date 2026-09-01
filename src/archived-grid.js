/* Arkiv-kjelleren: 4-kolonners grid (à la offgrid.inc). Klikk på et cover
   morpher inn i case-siden (cross-document view transition via navnet
   `case-cover`), og tilbake-morphen lander på riktig grid-kort. */

export function initArchivedGrid(rootEl) {
  const grid = (rootEl ?? document).querySelector('[data-archived-grid]')
  if (!grid) return

  const links = [...grid.querySelectorAll('a[data-case-id]')]
  const imageFor = (caseId) =>
    links.find((link) => link.dataset.caseId === caseId)?.querySelector('img') ?? null

  const clearNames = () => {
    links.forEach((link) => {
      const image = link.querySelector('img')
      if (image) image.style.viewTransitionName = ''
    })
  }

  /* Utreise: kun det klikkede coveret får morph-navnet — så snapshotet er
     entydig, og heroen på case-siden arver flaten. */
  links.forEach((link) => {
    link.addEventListener('click', () => {
      clearNames()
      const image = link.querySelector('img')
      if (image) image.style.viewTransitionName = 'case-cover'
      try {
        sessionStorage.setItem('timeline:last-case', link.dataset.caseId)
      } catch {
        /* uten sessionStorage mister vi bare tilbake-morphen */
      }
    })
  })

  /* Hjemreise fra en case: navngi tilsvarende kort FØR transition-snapshotet,
     og rydd når morphen er ferdig. */
  window.addEventListener('pagereveal', (event) => {
    if (!event.viewTransition) return
    let fromCase = null
    try {
      fromCase = sessionStorage.getItem('timeline:last-case')
    } catch {
      return
    }
    const image = imageFor(fromCase)
    if (!image) return
    image.style.viewTransitionName = 'case-cover'
    const cleanup = () => clearNames()
    event.viewTransition.finished.then(cleanup, cleanup)
  })
}
