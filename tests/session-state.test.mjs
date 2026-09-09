import test from 'node:test'
import assert from 'node:assert/strict'

const storage = new Map()
globalThis.window = new EventTarget()
window.sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }
const { sessionState } = await import('../src/session-state.js')

test('cached documents read preferences and click positions written by later documents', () => {
  sessionState.setItem('timeline:return-position', '{"id":"uber","center":0.25}')
  storage.set('timeline:return-position', '{"id":"uber","center":0.5}')
  assert.equal(sessionState.getItem('timeline:return-position'), '{"id":"uber","center":0.5}')
  sessionState.setItem('case:presentation', 'true')
  storage.set('case:presentation', 'false')
  assert.equal(sessionState.getItem('case:presentation'), 'false')
})
