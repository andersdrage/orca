// Prepare an active page's dragon before arrival. Keep its canvas mounted near
// the footer, but animate only while it is actually visible.
let initialized = false
export function initFooterDragons() {
  if (initialized) return
  initialized = true
  const figures = new Map(), warmObservers = new Map()
  let view, loading, failures = 0
  const eligible = figure => figure.isConnected &&
    !figure.closest('[inert], .project-overview-suspended') &&
    !document.body.classList.contains('world-map-intro')
  const reconcile = () => {
    const candidates = [...figures.keys()].filter(eligible)
    const target = candidates.find(figure => figures.get(figure).visible) || candidates.find(figure => figures.get(figure).near) || null
    if (view) { view.mount(target, target ? figures.get(target).visible : false); return }
    if (!target || loading || failures >= 2 || navigator.connection?.saveData) return
    loading = import('./footer-dragon.js').then(module => module.createFooterDragon()).then(result => {
      view = result; reconcile()
    }).catch(error => {
      loading = null; failures++
      console.warn('Footer dragon could not start:', error)
      if (failures < 2) setTimeout(reconcile, 500)
    })
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (figures.has(entry.target)) figures.get(entry.target).visible = entry.isIntersecting })
    reconcile()
  })
  const scan = () => {
    for (const [figure, state] of figures) {
      if (!figure.isConnected) { observer.unobserve(figure); state.warm.unobserve(figure); figures.delete(figure) }
    }
    for (const [root, warm] of warmObservers) {
      if (root && !root.isConnected) { warm.disconnect(); warmObservers.delete(root) }
    }
    document.querySelectorAll('.site-footer__dragon').forEach(figure => {
      if (figures.has(figure) || !figure.querySelector('img')) return
      const root = figure.closest('.world-page')
      if (!warmObservers.has(root)) {
        warmObservers.set(root, new IntersectionObserver(entries => {
          entries.forEach(entry => { if (figures.has(entry.target)) figures.get(entry.target).near = entry.isIntersecting })
          reconcile()
        }, { root, rootMargin: '1200px 0px' }))
      }
      const warm = warmObservers.get(root)
      figures.set(figure, { near: false, visible: false, warm })
      observer.observe(figure); warm.observe(figure)
    })
    reconcile()
  }
  scan()
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['inert', 'class'] })
}
