import { initHeader } from './header.js'
import { buildPortfolioHtml } from './portfolio-render.js'

const root = document.querySelector('[data-portfolio-root]')
if (root) {
  root.innerHTML = buildPortfolioHtml()
}

function initProjectAudio() {
  const button = document.querySelector('[data-project-audio-button]')
  const audio = document.querySelector('[data-project-audio]')
  const time = document.querySelector('[data-audio-time]')
  const container = button?.closest('.project-audio')
  const sentinel = document.querySelector('[data-project-audio-sentinel]')
  const projectSection = button?.closest('section')
  const nextProjectSection = projectSection?.nextElementSibling
  if (!button || !audio || !time) return

  const fallbackDuration = 141
  let hasActivatedAudio = false
  let isOriginalVisible = true
  let isWithinProjectArea = true
  let scrollTicking = false

  function updateDockedState() {
    const shouldDock = hasActivatedAudio && !isOriginalVisible && (!audio.paused || isWithinProjectArea)
    container?.classList.toggle('is-docked', shouldDock)
  }

  function updateProjectAreaState() {
    if (!projectSection) return

    const rect = projectSection.getBoundingClientRect()
    const nextRect = nextProjectSection?.getBoundingClientRect()
    isWithinProjectArea = rect.top < window.innerHeight && (!nextRect || nextRect.top > window.innerHeight)
    updateDockedState()
  }

  function scheduleProjectAreaUpdate() {
    if (scrollTicking) return

    scrollTicking = true
    window.requestAnimationFrame(() => {
      scrollTicking = false
      updateProjectAreaState()
    })
  }

  function formatTime(seconds) {
    const safeSeconds = Math.max(0, Math.ceil(seconds))
    const minutes = Math.floor(safeSeconds / 60)
    const rest = String(safeSeconds % 60).padStart(2, '0')
    return `${minutes}:${rest}`
  }

  function updateRemainingTime() {
    const duration = Number.isFinite(audio.duration) ? audio.duration : fallbackDuration
    time.textContent = formatTime(duration - audio.currentTime)
  }

  function setPlayingState(isPlaying) {
    button.classList.toggle('is-playing', isPlaying)
    button.setAttribute('aria-pressed', String(isPlaying))
    button.setAttribute(
      'aria-label',
      isPlaying ? 'Pause audio story about MICROMILSPEC' : 'Play audio story about MICROMILSPEC',
    )
    if (!isPlaying) updateRemainingTime()
    updateDockedState()
  }

  if (container && sentinel && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        isOriginalVisible = entry.isIntersecting
        updateProjectAreaState()
        updateDockedState()
      },
      { rootMargin: '-96px 0px -24px 0px' },
    )

    observer.observe(sentinel)
  }

  button.addEventListener('click', async () => {
    if (audio.paused) {
      try {
        await audio.play()
        hasActivatedAudio = true
        setPlayingState(true)
      } catch {
        setPlayingState(false)
      }
      return
    }

    audio.pause()
    setPlayingState(false)
  })

  audio.addEventListener('ended', () => {
    audio.currentTime = 0
    hasActivatedAudio = false
    setPlayingState(false)
  })
  audio.addEventListener('pause', () => setPlayingState(false))
  audio.addEventListener('loadedmetadata', updateRemainingTime)
  audio.addEventListener('timeupdate', updateRemainingTime)
  window.addEventListener('scroll', scheduleProjectAreaUpdate, { passive: true })
  window.addEventListener('resize', scheduleProjectAreaUpdate)
  updateRemainingTime()
  updateProjectAreaState()
  updateDockedState()
}

initProjectAudio()

function initProjectTranscript() {
  const openButton = document.querySelector('[data-transcript-open]')
  const modal = document.querySelector('[data-transcript-modal]')
  const closeButton = document.querySelector('[data-transcript-close]')
  if (!openButton || !modal || !closeButton) return

  function closeTranscript() {
    if (!modal.open || modal.classList.contains('is-closing')) return

    modal.classList.add('is-closing')
    window.setTimeout(() => {
      modal.classList.remove('is-closing')
      modal.close()
      openButton.focus()
    }, 120)
  }

  function handleTranscriptKeydown(event) {
    if (event.key !== 'Escape') return

    event.preventDefault()
    closeTranscript()
  }

  openButton.addEventListener('click', () => {
    if (typeof modal.showModal === 'function') {
      modal.showModal()
      closeButton.focus()
      window.addEventListener('keydown', handleTranscriptKeydown)
    }
  })

  closeButton.addEventListener('click', closeTranscript)

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeTranscript()
  })

  modal.addEventListener('cancel', (event) => {
    event.preventDefault()
    closeTranscript()
  })

  modal.addEventListener('close', () => {
    window.removeEventListener('keydown', handleTranscriptKeydown)
  })
}

initProjectTranscript()

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
