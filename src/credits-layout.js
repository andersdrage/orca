import { sessionState } from './session-state.js'
import { syncVisibleMedia } from './visible-media.js'
import { initCaseIntroScroll } from './case-intro-scroll.js'

export function initCreditsLayout(root) {
  const credits = root.querySelector('.case-credits')
  const lead = root.querySelector('.case-lead, .case-legacy-lead')
  if (!lead) return
  const updateIntroScroll = initCaseIntroScroll(lead)
  const hero = lead.querySelector('.case-cover-hero')
  const content = lead.nextElementSibling
  const onlyCover = hero?.children.length > 0 && content?.children.length === 0
  const layouts = ['original', 'columns', 'below']
  const saved = sessionState.getItem('credits:layout')
  let selected = layouts.includes(saved) ? saved : 'original'
  let presentation = sessionState.getItem('case:presentation') !== 'false'

  const count = root.querySelectorAll('.case-credits__row').length
  credits?.style.setProperty('--credits-rows', Math.ceil(count / 3))
  credits?.style.setProperty('--credits-mobile-rows', Math.ceil(count / 2))
  root.querySelectorAll('.case-credits__row').forEach((row, index) => {
    row.style.setProperty('--contributor-delay', `${320 + index * 55}ms`)
  })
  const apply = () => {
    const layout = presentation ? 'presentation' : selected
    lead.dataset.layout = layout
    if (credits) credits.dataset.layout = layout
    if (onlyCover) {
      if (presentation) content.append(...hero.children)
      else hero.append(...content.children)
    }
    if (lead.classList.contains('case-legacy-lead')) lead.classList.toggle('work-media', layout === 'below' || presentation)
    else if (hero) {
      if (layout === 'below') lead.prepend(hero)
      else lead.append(hero)
    }
    updateIntroScroll()
  }
  apply()

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase()
    if (!['c', 'p'].includes(key) || event.defaultPrevented || event.repeat || event.isComposing) return
    if (event.metaKey || event.ctrlKey || event.altKey) return
    if (event.target instanceof Element &&
      (event.target.closest('input, textarea, select, [role="textbox"]') || event.target.isContentEditable)) return
    if (document.querySelector('dialog[open]')) return
    event.preventDefault()
    document.body.classList.remove('case-transition-entrance')
    if (key === 'p') presentation = !presentation
    else {
      presentation = false
      selected = layouts[(layouts.indexOf(selected) + 1) % layouts.length]
      sessionState.setItem('credits:layout', selected)
    }
    sessionState.setItem('case:presentation', String(presentation))
    apply()
    if (key === 'p') window.scrollTo({ top: 0, behavior: 'instant' })
    syncVisibleMedia(root)
  })
}
