// A document can be restored from the page cache or receive a new click before
// its previous transition finishes. Only the current run may clean up its state.
import { sessionState } from './session-state.js'

let active = null

export function cancelProjectTransition() {
  if (!active) return
  const run = active
  active = null
  run.transition?.skipTransition()
  run.animations.forEach(animation => animation.cancel())
  run.cleanup()
}

window.addEventListener('pageswap', cancelProjectTransition)

export function playProjectTransition(transition, { start, cleanup, fallback }) {
  cancelProjectTransition()
  const run = { transition, cleanup, animations: [], fallingBack: false }
  active = run
  const finish = () => {
    if (active !== run) return
    active = null
    run.animations.forEach(animation => animation.cancel())
    cleanup()
  }
  const recover = () => {
    if (active !== run || run.fallingBack) return
    run.fallingBack = true
    cleanup()
    if (document.hidden) return finish()
    run.animations = fallback?.() ?? []
    if (sessionState.getItem('debug:slow-animations') === '1') {
      run.animations.forEach(animation => { animation.playbackRate = 0.3 })
    }
    Promise.allSettled(run.animations.map(animation => animation.finished)).then(finish)
  }
  start()
  if (!transition) return recover()
  transition.ready.catch(recover)
  const nativeFinished = () => { if (!run.fallingBack) finish() }
  transition.finished.then(nativeFinished, nativeFinished)
}
