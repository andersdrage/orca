import { initHeader } from './header.js'
import { buildCaseHtml } from './portfolio-render.js'
import { initProjectAudio, initProjectTranscript } from './project-audio.js'
import closeIconUrl from './assets/icons/close.svg?url'

const root = document.querySelector('[data-case-root]')
if (root) {
  root.innerHTML = buildCaseHtml(root.dataset.caseId)
  /* Husk hvilken case vi står på — så «lukk» (og back) alltid kan morphe til riktig tile,
     også etter direktebesøk på case-URL-en. */
  sessionStorage.setItem('timeline:last-case', root.dataset.caseId)
}

initProjectAudio()
initProjectTranscript()

/* Zoom-inn: forsiden (old root-snapshot) skaleres opp mot coverets posisjon,
   lagret i sessionStorage ved klikk på tilen. */
window.addEventListener('pagereveal', (event) => {
  if (!event.viewTransition) return

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

  const origin = sessionStorage.getItem('timeline:zoom-origin')
  const htmlRoot = document.documentElement
  if (origin) htmlRoot.style.setProperty('--vt-origin', origin)
  htmlRoot.classList.add('vt-zoom-in')

  /* Ankom lys: mørk-temaet holdes tilbake til zoomen er ferdig, og fader så inn. */
  document.body.classList.add('bg-hold')

  const cleanup = () => htmlRoot.classList.remove('vt-zoom-in')
  event.viewTransition.finished.then(cleanup, cleanup)
  const releaseBg = () => {
    setTimeout(() => document.body.classList.remove('bg-hold'), 150)
  }
  event.viewTransition.finished.then(releaseBg, releaseBg)
})

/* Lukking: tilbake til tidslinjen med zoom-ut. history.back() bevarer
   scroll-posisjon og gir traverse-morph; direktebesøk faller tilbake til forsiden. */
function closeCase() {
  let sameOriginReferrer = false
  try {
    sameOriginReferrer = Boolean(document.referrer) && new URL(document.referrer).origin === location.origin
  } catch {
    sameOriginReferrer = false
  }
  if (sameOriginReferrer && history.length > 1) history.back()
  else location.href = '/'
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
