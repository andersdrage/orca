import { sessionState } from './session-state.js'

// Values can be adjusted directly before taking a screenshot. Keep edits in this tab.
document.querySelectorAll('[data-field]').forEach(field => {
  const key = `sharing-image:${field.dataset.field}`
  const saved = sessionState.getItem(key)
  if (saved !== null) field.textContent = saved
  field.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); field.blur() }
  })
  field.addEventListener('blur', () => {
    field.textContent = field.textContent.trim().replace(/\s+/g, ' ')
    sessionState.setItem(key, field.textContent)
  })
})
