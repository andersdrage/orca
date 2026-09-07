import { initHeader } from './header.js'
import { micromilspecCovers, portfolioCases } from './portfolio-data.js'
import { sessionState } from './session-state.js'
import { buildCaseHtml } from './portfolio-render.js'
import { initProjectAudio, initProjectTranscript } from './project-audio.js'
import closeIconUrl from './assets/icons/close.svg?url'

const root = document.querySelector('[data-case-root]')
const ARCHIVED_ORDER = ['hmkg', 'humming-people', 'brathwait', 'mountain-milk']
const OVERVIEWS = ['/', '/about/', '/praise/', '/archive/', '/people/', '/archived-work/']
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
  /* Husk hvilken case vi står på — så «lukk» (og back) alltid kan morphe til riktig tile,
     også etter direktebesøk på case-URL-en. */
  sessionState.setItem('timeline:last-case', root.dataset.caseId)
  initCoverCycle(root.dataset.caseId)
  initArchivedCaseNav(root.dataset.caseId)
}

/* Arkiverte caser (kjelleren): ‹ › blar til forrige/neste arkiverte prosjekt
   (også ← →). Hero-til-hero view transition-morphen binder byttene sammen. */
function initArchivedCaseNav(caseId) {
  const index = ARCHIVED_ORDER.indexOf(caseId)
  if (index === -1) return
  const total = ARCHIVED_ORDER.length
  const prevHref = `/${ARCHIVED_ORDER[(index - 1 + total) % total]}/`
  const nextHref = `/${ARCHIVED_ORDER[(index + 1) % total]}/`

  const arrow = (href, direction, label, glyph) => {
    const link = document.createElement('a')
    link.href = href
    link.className = `case-nav case-nav--${direction}`
    link.setAttribute('aria-label', label)
    link.textContent = glyph
    document.body.append(link)
  }
  arrow(prevHref, 'prev', 'Previous archived project', '‹')
  arrow(nextHref, 'next', 'Next archived project', '›')

  window.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    if (document.querySelector('dialog[open]')) return
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      rememberCaseReturn(prevHref)
      location.href = prevHref
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      rememberCaseReturn(nextHref)
      location.href = nextHref
    }
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

  /* Innholdet under heroen holdes skjult under morphen og stiger inn nedenfra
     (opacity + translateY) først når overgangen er ferdig. Klassene settes kun
     når en view transition faktisk kjører — direktebesøk viser alt statisk. */
  document.body.classList.add('case-entering')
  const revealBelow = () => {
    document.body.classList.add('case-entered')
    document.body.classList.remove('case-entering')
  }
  event.viewTransition.finished.then(revealBelow, revealBelow)

  /* Ytelse: autoplay-videoer begynner å dekode midt i overgangen og stjeler
     frames. Pauses mens animasjonen kjører, gjenopptas når den er ferdig. */
  const videos = [...document.querySelectorAll('#work video')]
  videos.forEach((video) => video.pause())
  const resumeVideos = () => {
    videos.forEach((video) => {
      video.play().catch(() => {})
    })
  }
  event.viewTransition.finished.then(resumeVideos, resumeVideos)

  const fromUrl = window.navigation?.activation?.from?.url ?? document.referrer
  let fromHome = false
  try {
    fromHome = new URL(fromUrl).pathname === '/'
  } catch {
    fromHome = false
  }
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
    if (event.key !== 'Escape') return
    if (document.querySelector('dialog[open]')) return
    event.preventDefault()
    closeCase()
  })
}

initCaseClose()

const header = initHeader()
const stickyTitle = document.querySelector('[data-sticky-work-title]')
const portfolioSections = [...document.querySelectorAll('#work section[aria-labelledby]')]

function updateStickyWorkTitle() {
  if (!header || !stickyTitle || portfolioSections.length === 0) return

  const headerBottom = header.getBoundingClientRect().bottom
  const activeSection = portfolioSections.find((section) => {
    const title = document.getElementById(section.getAttribute('aria-labelledby') ?? '')
    if (!title) return false

    const titleTop = title.getBoundingClientRect().top
    const sectionBottom = section.getBoundingClientRect().bottom
    return titleTop <= headerBottom && sectionBottom > headerBottom
  })

  if (activeSection) {
    const title = document.getElementById(activeSection.getAttribute('aria-labelledby') ?? '')
    stickyTitle.textContent = title?.textContent?.trim() ?? ''
  }

  stickyTitle.classList.toggle('is-visible', Boolean(activeSection))
}

if (header && stickyTitle) {
  updateStickyWorkTitle()
  window.addEventListener('scroll', updateStickyWorkTitle, { passive: true })
  window.addEventListener('resize', updateStickyWorkTitle)
}
