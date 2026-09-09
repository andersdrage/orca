import { initHeader } from './header.js'
import { micromilspecCovers, portfolioCases } from './portfolio-data.js'
import { sessionState } from './session-state.js'
import { buildCaseHtml } from './portfolio-render.js'
import { initProjectAudio, initProjectTranscript } from './project-audio.js'
import { initCaseTabs } from './case-tabs.js'
import { initCreditsLayout } from './credits-layout.js'
import { initCaseGallery } from './case-gallery.js'
import { initCaseComparisons } from './case-comparison.js'
import { caseNeighbors, caseArrowDirection } from './case-navigation.js'
import { initProjectReveal } from './project-reveal.js'
import closeIconUrl from './assets/icons/close.svg?url'

const root = document.querySelector('[data-case-root]')
const OVERVIEWS = ['/', '/about/', '/praise/', '/history/', '/people/', '/archived-work/']
const returnOverview = getReturnOverview()

function previousUrl() {
  try {
    const url = new URL(window.navigation?.activation?.from?.url ?? document.referrer)
    return url.origin === location.origin ? url : null
  } catch {
    return null
  }
}

function getReturnOverview() {
  // History state belongs to this entry, so reload and Back do not lose its origin.
  const saved = history.state?.caseOverview
  if (OVERVIEWS.includes(saved)) return saved
  const from = previousUrl()
  let overview = '/'
  if (OVERVIEWS.includes(from?.pathname)) overview = from.pathname
  else {
    try {
      const pending = JSON.parse(sessionState.getItem('case:return'))
      if (pending?.from === from?.pathname && pending?.to === location.pathname && OVERVIEWS.includes(pending?.overview)) {
        overview = pending.overview
      }
    } catch {
      // Missing or stale navigation state uses the case's overview fallback.
    }
  }
  history.replaceState({ ...history.state, caseOverview: overview }, '')
  return overview
}

function rememberCaseReturn(href) {
  const destination = new URL(href, location.href)
  if (destination.origin !== location.origin) return
  if (!portfolioCases.some((project) => destination.pathname === `/${project.id}/`)) return
  sessionState.setItem('case:return', JSON.stringify({
    from: location.pathname,
    to: destination.pathname,
    overview: returnOverview,
  }))
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('a')
  if (link) rememberCaseReturn(link.href)
})

if (root) {
  root.innerHTML = buildCaseHtml(root.dataset.caseId)
  initCreditsLayout(root)
  initCaseGallery(root)
  initCaseComparisons(root)
  // Keep the fixed story controls outside the animated/translated case layout.
  const storyControls = root.querySelector('.project-audio')
  if (storyControls) document.body.append(storyControls)
  initCaseTabs(root)
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
  let navigating = false
  window.addEventListener('pageshow', () => { navigating = false })
  window.addEventListener('keydown', (event) => {
    const direction = caseArrowDirection(event, Boolean(document.querySelector('dialog[open]')))
    if (!direction || navigating) return
    const href = direction === 'previous' ? prevHref : nextHref
    event.preventDefault()
    navigating = true
    rememberCaseReturn(href)
    location.href = href
  })
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

/* Back preserves the timeline when it really is the preceding entry. After
   case-to-case arrows, close exits to the saved overview; browser Back is untouched. */
function closeCase() {
  if (previousUrl()?.pathname === returnOverview && history.length > 1) history.back()
  else location.href = returnOverview
}

function initCaseClose() {
  const button = document.createElement('button')
  button.className = 'case-close'
  button.type = 'button'
  button.setAttribute('aria-label', 'Close project and return to overview')
  button.innerHTML = `<img src="${closeIconUrl}" alt="" width="18" height="18" aria-hidden="true" />`
  button.addEventListener('click', closeCase)
  document.body.append(button)

  /* Esc lukker prosjektet — men ikke mens transkript-modalen er åpen (der lukker Esc modalen). */
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return
    if (document.querySelector('dialog[open]')) return
    event.preventDefault()
    closeCase()
  })
}

initCaseClose()

initHeader()
initProjectReveal(root)
