import { micromilspecCovers } from './portfolio-data.js'
import { sessionState } from './session-state.js'
import { buildCaseHtml } from './portfolio-render.js'
import { initProjectAudio, initProjectTranscript } from './project-audio.js'
import { initCaseTabs } from './case-tabs.js'
import { initCreditsLayout } from './credits-layout.js'
import { initCaseGallery } from './case-gallery.js'
import { initCaseComparisons } from './case-comparison.js'
import { caseNeighbors, caseArrowDirection } from './case-navigation.js'
import closeIconUrl from './assets/icons/close.svg?url'

export function mountCase(root, { navigate, close }) {
  const lifetime = new AbortController()
  const { signal } = lifetime
  const cleanups = []
  if (root) {
    root.innerHTML = buildCaseHtml(root.dataset.caseId)
    initCreditsLayout(root, { signal })
    cleanups.push(initCaseGallery(root))
    initCaseComparisons(root, { signal })
    // Keep the fixed story controls outside the animated/translated case layout.
    const storyControls = root.querySelector('.project-audio')
    if (storyControls) {
      document.body.append(storyControls)
      cleanups.push(() => {
        storyControls.querySelectorAll("audio").forEach(audio => audio.pause())
        storyControls.querySelectorAll("dialog[open]").forEach(dialog => dialog.close())
        storyControls.remove()
      })
    }
    cleanups.push(initCaseTabs(root))
    // Remember the project so close and Back restore its index position.
    sessionState.setItem('timeline:last-case', root.dataset.caseId)
    initCoverCycle(root.dataset.caseId)
    initCaseNav(root.dataset.caseId)
  }

  /* Case navigation preserves the overview used to enter the project. */
  function initCaseNav(caseId) {
    const neighbors = caseNeighbors(caseId)
    if (!neighbors) return
    const prevHref = `/${neighbors.previous}/`
    const nextHref = `/${neighbors.next}/`
    window.addEventListener('keydown', (event) => {
      const direction = caseArrowDirection(event, Boolean(document.querySelector('dialog[open]')))
      if (!direction) return
      const href = direction === 'previous' ? prevHref : nextHref
      event.preventDefault()
      navigate(href)
    }, { signal })
  }

  // Keep the case cover consistent with the variant selected on the index.
  function initCoverCycle(caseId) {
    if (caseId !== 'micromilspec') return
    const hero = document.querySelector('.case-cover-hero img')
    if (!hero) return

    try {
      const index = Number(sessionState.getItem('micromilspec:cover')) || 0
      if (index > 0 && micromilspecCovers[index]) {
        hero.src = `/images/${micromilspecCovers[index].file}`
        const [width, height] = micromilspecCovers[index].ratio.split('/').map(Number)
        hero.width = width
        hero.height = height
        hero.style.aspectRatio = micromilspecCovers[index].ratio
      }
    } catch {
      /* sessionStorage utilgjengelig → standard-cover */
    }
  }

  initProjectAudio()
  initProjectTranscript()

  function initCaseClose() {
    const button = document.createElement('button')
    button.className = 'case-close'
    button.type = 'button'
    button.setAttribute('aria-label', 'Close project and return to overview')
    button.innerHTML = `<img src="${closeIconUrl}" alt="" width="18" height="18" aria-hidden="true" />`
    button.addEventListener('click', close)
    document.body.append(button)
    cleanups.push(() => button.remove())

    /* Esc lukker prosjektet — men ikke mens transkript-modalen er åpen (der lukker Esc modalen). */
    window.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (document.querySelector('dialog[open]')) return
      event.preventDefault()
      close()
    }, { signal })
  }

  initCaseClose()

  return () => {
    lifetime.abort()
    root.querySelectorAll('video, audio').forEach(media => media.pause())
    cleanups.reverse().forEach(cleanup => cleanup?.())
  }
}
