/* Dev-verktøy: trykk S → panel med sakte film-bryter. Alle animasjoner (inkludert
   view transitions mellom sider) spilles på 30 % hastighet så de kan inspiseres
   uten skjermopptak. Valget lagres i sessionStorage og overlever sidebytter. */

const RATE = 0.3
const STORAGE_KEY = 'debug:slow-animations'

export function initAnimationInspector() {
  let panel = null

  const isEnabled = () => sessionStorage.getItem(STORAGE_KEY) === '1'

  function setAllPlaybackRates(rate) {
    document.getAnimations().forEach((animation) => {
      animation.playbackRate = rate
    })
  }

  function buildPanel() {
    panel = document.createElement('div')
    panel.className = 'debug-panel'
    panel.innerHTML = `
      <p class="debug-panel__title">Animation inspector</p>
      <label class="debug-panel__row">
        <input type="checkbox" data-debug-slow ${isEnabled() ? 'checked' : ''} />
        <span>Play animations at 30% speed</span>
      </label>
      <p class="debug-panel__hint">Press S to hide</p>`
    document.body.append(panel)
    panel.querySelector('[data-debug-slow]').addEventListener('change', (event) => {
      sessionStorage.setItem(STORAGE_KEY, event.target.checked ? '1' : '0')
      setAllPlaybackRates(event.target.checked ? RATE : 1)
    })
  }

  window.addEventListener('keydown', (event) => {
    if (event.key !== 's' && event.key !== 'S') return
    if (event.metaKey || event.ctrlKey || event.altKey) return
    const target = event.target
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName))
    ) {
      return
    }
    if (!panel) buildPanel()
    else panel.hidden = !panel.hidden
  })

  /* Nye in-page-animasjoner og transitions bremses idet de starter. */
  const slowOnStart = (event) => {
    if (!isEnabled()) return
    if (event.target instanceof Element) {
      event.target.getAnimations().forEach((animation) => {
        animation.playbackRate = RATE
      })
    }
  }
  document.addEventListener('animationstart', slowOnStart, true)
  document.addEventListener('transitionstart', slowOnStart, true)

  /* View transitions: når pseudo-treet er klart har alle gruppene sine animasjoner —
     senk hastigheten på alt i ett jafs. */
  window.addEventListener('pagereveal', (event) => {
    if (!event.viewTransition || !isEnabled()) return
    event.viewTransition.ready.then(
      () => setAllPlaybackRates(RATE),
      () => {},
    )
  })

  if (isEnabled()) setAllPlaybackRates(RATE)
}
