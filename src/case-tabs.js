export function initCaseTabs(root) {
  root.querySelectorAll('[data-case-tabs]').forEach((group) => {
    const bar = group.querySelector('[role="tablist"]')
    const scroller = group.querySelector('.case-tabs__scroll')
    const pill = group.querySelector('.t-tabs-pill')
    const tabs = [...bar.querySelectorAll('[role="tab"]')]
    const panels = [...group.querySelectorAll('[role="tabpanel"]')]
    let active = 0

    function positionPill(animate = false) {
      if (!animate) pill.style.transition = 'none'
      pill.style.transform = `translateX(${tabs[active].offsetLeft}px)`
      pill.style.width = `${tabs[active].offsetWidth}px`
      if (!animate) {
        void pill.offsetWidth
        pill.style.removeProperty('transition')
      }
    }

    function select(index, animate) {
      active = index
      tabs.forEach((tab, i) => {
        tab.setAttribute('aria-selected', String(i === active))
        tab.tabIndex = i === active ? 0 : -1
        panels[i].hidden = i !== active
      })
      positionPill(animate)
      // Scroll only the tab strip, never the page or its camera world.
      const tab = tabs[active]
      const left = tab.offsetLeft + bar.offsetLeft
      if (left < scroller.scrollLeft) scroller.scrollLeft = left
      else if (left + tab.offsetWidth > scroller.scrollLeft + scroller.clientWidth) {
        scroller.scrollLeft = left + tab.offsetWidth - scroller.clientWidth
      }
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', (event) => select(index, event.detail > 0))
      tab.addEventListener('keydown', (event) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return
        let next
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
        if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length
        if (event.key === 'Home') next = 0
        if (event.key === 'End') next = tabs.length - 1
        if (next === undefined) return
        event.preventDefault()
        select(next, false)
        tabs[next].focus({ preventScroll: true })
      })
    })

    positionPill()
    new ResizeObserver(() => positionPill()).observe(bar)
    document.fonts.ready.then(() => positionPill())
    // These small images load together only near the gallery, so keyboard
    // switching is immediate without competing with the case hero at entry.
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      group.querySelectorAll('img').forEach((image) => { image.loading = 'eager' })
      observer.disconnect()
    }, { rootMargin: '400px' })
    observer.observe(group)
  })
}
