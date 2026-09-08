import { initHeader } from './header.js'
import { micromilspecCovers, portfolioCases } from './portfolio-data.js'
import { sessionState } from './session-state.js'
import { buildCaseHtml } from './portfolio-render.js'
import { initProjectAudio, initProjectTranscript } from './project-audio.js'
import { initCaseTabs } from './case-tabs.js'
import { initCreditsLayout } from './credits-layout.js'
import { initCaseGallery } from './case-gallery.js'
import { ARCHIVED_ORDER, caseNeighbors, caseArrowDirection } from './case-navigation.js'
import { syncVisibleMedia } from './visible-media.js'
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
  let overview = ARCHIVED_ORDER.includes(root?.dataset.caseId) ? '/archived-work/' : '/'
  if (OVERVIEWS.includes(from?.pathname)) overview = from.pathname
  else {
    try {
      const pending = JSON.parse(sessionState.getItem('case:return'))
      if (pending?.from === from?.pathname && pending?.to === location.pathname && OVERVIEWS.includes(pending?.overview)) {
        overview = pending.overview
      }
    } catch {
      // Missing or stale transition state uses the case's overview fallback.
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
  // Keep the fixed story controls outside the animated/translated case layout.
  const storyControls = root.querySelector('.project-audio')
  if (storyControls) document.body.append(storyControls)
  initCaseTabs(root)
  /* Husk hvilken case vi står på — så «lukk» (og back) alltid kan morphe til riktig tile,
     også etter direktebesøk på case-URL-en. */
  sessionState.setItem('timeline:last-case', root.dataset.caseId)
  initCoverCycle(root.dataset.caseId)
  initCaseNav(root.dataset.caseId)
}

/* All cases use the same hero-to-hero transition and preserve their entry overview. */
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

/* Case-heroen følger cover-varianten valgt med B på forsiden (sessionStorage) —
   tilen man morpher fra og heroen man lander i er da samme bilde. Selve
   B-syklingen bor KUN på forsiden (timeline.js). */
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

/* Zoom-inn: forsiden (old root-snapshot) skaleres opp mot coverets posisjon,
   lagret i sessionStorage ved klikk på tilen. */
window.addEventListener('pagereveal', (event) => {
  if (!event.viewTransition) return

  const fromUrl = window.navigation?.activation?.from?.url ?? document.referrer
  let fromHome = false
  try {
    fromHome = new URL(fromUrl).pathname === '/'
  } catch {
    fromHome = false
  }
  const presentation = root?.querySelector('[data-layout="presentation"]')
  if (fromHome && presentation && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const html = document.documentElement
    html.classList.add('vt-zoom-in', 'vt-presentation-in')
    document.body.classList.add('case-entering', 'case-transition-entrance')
    const origin = sessionState.getItem('timeline:zoom-origin')
    if (origin) html.style.setProperty('--vt-origin', origin)
    root.querySelectorAll('video').forEach(video => video.pause())
    const finish = () => {
      html.classList.remove('vt-zoom-in', 'vt-presentation-in')
      document.body.classList.remove('case-entering')
      syncVisibleMedia()
    }
    event.viewTransition.finished.then(finish, finish)
    return
  }

  /* Innholdet under heroen holdes skjult under morphen og stiger inn nedenfra
     (opacity + translateY) først når overgangen er ferdig. Klassene settes kun
     når en view transition faktisk kjører — direktebesøk viser alt statisk. */
  document.body.classList.add('case-entering')
  const revealBelow = () => {
    document.body.classList.add('case-entered')
    document.body.classList.remove('case-entering')
    syncVisibleMedia()
  }
  event.viewTransition.finished.then(revealBelow, revealBelow)

  /* Ytelse: autoplay-videoer begynner å dekode midt i overgangen og stjeler
     frames. Pauses mens animasjonen kjører, gjenopptas når den er ferdig. */
  const videos = [...document.querySelectorAll('#work video')]
  videos.forEach((video) => video.pause())
  const resumeVideos = () => syncVisibleMedia()
  event.viewTransition.finished.then(resumeVideos, resumeVideos)

  if (!fromHome) return

  const origin = sessionState.getItem('timeline:zoom-origin')
  const htmlRoot = document.documentElement
  if (origin) htmlRoot.style.setProperty('--vt-origin', origin)
  htmlRoot.classList.add('vt-zoom-in')

  const cleanup = () => htmlRoot.classList.remove('vt-zoom-in')
  event.viewTransition.finished.then(cleanup, cleanup)
})

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
