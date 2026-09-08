import test from 'node:test'
import assert from 'node:assert/strict'

const storage = new Map()
globalThis.window = new EventTarget()
window.sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }
globalThis.document = { hidden: false }
const { playProjectTransition, cancelProjectTransition } = await import('../src/project-transition.js')
const { sessionState } = await import('../src/session-state.js')
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const flush = () => new Promise(resolve => setImmediate(resolve))
function transition() {
  const ready = deferred(), finished = deferred()
  return { ready, finished, api: { ready: ready.promise, finished: finished.promise,
    skipTransition() { ready.reject(new Error('Interrupted')); finished.resolve() } } }
}

test('an interrupted transition cannot clean up the next click or start a fallback', async () => {
  const first = transition(), next = transition()
  let state = '', recovered = 0
  playProjectTransition(first.api, { start: () => { state = 'first' }, cleanup: () => { state = '' }, fallback: () => { recovered++; return [] } })
  playProjectTransition(next.api, { start: () => { state = 'next' }, cleanup: () => { state = '' } })
  await flush()
  assert.equal(state, 'next')
  assert.equal(recovered, 0)
  next.ready.resolve(); next.finished.resolve(); await flush()
  assert.equal(state, '')
})

test('a skipped native transition keeps its fallback alive until it finishes', async () => {
  const native = transition(), animation = deferred()
  let cancelled = 0, recovered = 0
  playProjectTransition(native.api, { start() {}, cleanup() {}, fallback: () => {
    recovered++
    return [{ finished: animation.promise, cancel() { cancelled++ } }]
  } })
  native.api.skipTransition(); await flush()
  assert.equal(recovered, 1)
  assert.equal(cancelled, 0, 'native completion must not cancel its replacement')
  animation.resolve(); await flush()
  assert.equal(cancelled, 1, 'finished transforms are released')
})

test('leaving during a fallback cancels it without leaving animation state behind', async () => {
  const animation = deferred()
  let cancelled = false
  playProjectTransition(null, { start() {}, cleanup() {}, fallback: () => [
    { finished: animation.promise, cancel() { cancelled = true; animation.reject(new Error('Cancelled')) } },
  ] })
  window.dispatchEvent(new Event('pageswap'))
  await flush()
  assert.equal(cancelled, true)
  cancelProjectTransition()
})

test('cached documents read preferences and click positions written by later documents', () => {
  sessionState.setItem('timeline:zoom-origin', '200px 450px')
  storage.set('timeline:zoom-origin', '1100px 450px')
  assert.equal(sessionState.getItem('timeline:zoom-origin'), '1100px 450px')
  sessionState.setItem('case:presentation', 'true')
  storage.set('case:presentation', 'false')
  assert.equal(sessionState.getItem('case:presentation'), 'false')
})
