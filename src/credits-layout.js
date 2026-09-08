import { sessionState } from './session-state.js'

export function initCreditsLayout(root) {
  const credits = root.querySelector('.case-credits')
  if (!credits) return

  const count = credits.querySelectorAll('.case-credits__row').length
  credits.style.setProperty('--credits-rows', Math.ceil(count / 3))
  credits.style.setProperty('--credits-mobile-rows', Math.ceil(count / 2))
  credits.dataset.layout = sessionState.getItem('credits:layout') === 'columns' ? 'columns' : 'original'

  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() !== 'c' || event.defaultPrevented || event.repeat || event.isComposing) return
    if (event.metaKey || event.ctrlKey || event.altKey) return
    if (event.target instanceof Element &&
      (event.target.closest('input, textarea, select, [role="textbox"]') || event.target.isContentEditable)) return
    if (document.querySelector('dialog[open]')) return
    event.preventDefault()
    credits.dataset.layout = credits.dataset.layout === 'columns' ? 'original' : 'columns'
    sessionState.setItem('credits:layout', credits.dataset.layout)
  })
}
