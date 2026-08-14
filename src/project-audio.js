/* Lydspiller + transkript-modal for prosjektsider. Flyttet ut fra main.js da forsiden ble tidslinje. */

export function initProjectAudio() {
  const containers = [...document.querySelectorAll('.project-audio')]
  if (containers.length === 0) return

  function formatTime(seconds) {
    const safeSeconds = Math.max(0, Math.ceil(seconds))
    const minutes = Math.floor(safeSeconds / 60)
    const rest = String(safeSeconds % 60).padStart(2, '0')
    return `${minutes}:${rest}`
  }

  containers.forEach((container) => {
    const button = container.querySelector('[data-project-audio-button]')
    const audio = container.querySelector('[data-project-audio]')
    const time = container.querySelector('[data-audio-time]')
    const sentinel = container.previousElementSibling?.matches('[data-project-audio-sentinel]')
      ? container.previousElementSibling
      : null
    const projectSection = button?.closest('section')
    const nextProjectSection = projectSection?.nextElementSibling
    if (!button || !audio || !time) return

    const fallbackDuration = Number(audio.dataset.audioFallbackDuration) || 141
    const audioTitle = audio.dataset.audioTitle || 'this project'
    let hasActivatedAudio = false
    let isOriginalVisible = true
    let isWithinProjectArea = true
    let scrollTicking = false

    function updateDockedState() {
      const shouldDock = hasActivatedAudio && !isOriginalVisible && (!audio.paused || isWithinProjectArea)
      container.classList.toggle('is-docked', shouldDock)
    }

    function updateProjectAreaState() {
      if (!projectSection) return

      const rect = projectSection.getBoundingClientRect()
      const nextRect = nextProjectSection?.getBoundingClientRect()
      isWithinProjectArea =
        rect.top < window.innerHeight && rect.bottom > 120 && (!nextRect || nextRect.top > window.innerHeight)
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

    function updateRemainingTime() {
      const duration = Number.isFinite(audio.duration) ? audio.duration : fallbackDuration
      time.textContent = formatTime(duration - audio.currentTime)
    }

    function setPlayingState(isPlaying) {
      button.classList.toggle('is-playing', isPlaying)
      button.setAttribute('aria-pressed', String(isPlaying))
      button.setAttribute(
        'aria-label',
        isPlaying ? `Pause audio story about ${audioTitle}` : `Play audio story about ${audioTitle}`,
      )
      if (!isPlaying) updateRemainingTime()
      updateDockedState()
    }

    if (sentinel && 'IntersectionObserver' in window) {
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
          document.querySelectorAll('[data-project-audio]').forEach((otherAudio) => {
            if (otherAudio !== audio) otherAudio.pause()
          })
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
  })
}

export function initProjectTranscript() {
  const containers = [...document.querySelectorAll('.project-audio')]
  if (containers.length === 0) return

  containers.forEach((container) => {
    const openButton = container.querySelector('[data-transcript-open]')
    const modal = container.querySelector('[data-transcript-modal]')
    const closeButton = container.querySelector('[data-transcript-close]')
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
  })
}
