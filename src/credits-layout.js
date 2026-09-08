import { sessionState } from './session-state.js'

export function initCreditsLayout(root) {
  const credits = root.querySelector('.case-credits')
  const lead = root.querySelector('.case-lead, .case-legacy-lead')
  if (!lead) return
  const hero = lead.querySelector('.case-cover-hero')
  const layouts = ['original', 'columns', 'below']

  const count = root.querySelectorAll('.case-credits__row').length
  credits?.style.setProperty('--credits-rows', Math.ceil(count / 3))
  credits?.style.setProperty('--credits-mobile-rows', Math.ceil(count / 2))
  const apply = (layout) => {
    lead.dataset.layout = layout
    if (credits) credits.dataset.layout = layout
    if (lead.classList.contains('case-legacy-lead')) lead.classList.toggle('work-media', layout === 'below')
    else if (hero) {
      if (layout === 'below') lead.prepend(hero)
      else lead.append(hero)
    }
  }
  const saved = sessionState.getItem('credits:layout')
  apply(layouts.includes(saved) ? saved : 'original')

  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() !== 'c' || event.defaultPrevented || event.repeat || event.isComposing) return
    if (event.metaKey || event.ctrlKey || event.altKey) return
    if (event.target instanceof Element &&
      (event.target.closest('input, textarea, select, [role="textbox"]') || event.target.isContentEditable)) return
    if (document.querySelector('dialog[open]')) return
    event.preventDefault()
    const layout = layouts[(layouts.indexOf(lead.dataset.layout) + 1) % layouts.length]
    apply(layout)
    sessionState.setItem('credits:layout', layout)
  })
}
