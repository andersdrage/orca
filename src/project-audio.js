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
    const status = container.querySelector('[data-audio-status]')
    const label = container.querySelector('[data-audio-label]')
    const idleLabel = label.textContent
    if (!button || !audio || !time) return

    const fallbackDuration = Number(audio.dataset.audioFallbackDuration) || 141
    const audioTitle = audio.dataset.audioTitle || 'this project'
    let pending = false
    let failed = false

    function feedback(state) {
      failed = state === 'error'
      status.textContent = failed ? 'Audio couldn’t load. Try again or read the notes.' : state === 'loading' ? 'Loading audio…' : ''
      label.textContent = failed ? 'Retry' : audio.paused ? idleLabel : 'Pause'
      button.setAttribute('aria-busy', String(state === 'loading'))
      button.setAttribute('aria-label', failed ? `Retry audio story about ${audioTitle}` : audio.paused ? `Listen to the personal story about ${audioTitle}` : `Pause audio story about ${audioTitle}`)
    }

    function updateRemainingTime() {
      const duration = Number.isFinite(audio.duration) ? audio.duration : fallbackDuration
      time.textContent = formatTime(duration - audio.currentTime)
    }

    function setPlayingState(isPlaying) {
      button.classList.toggle('is-playing', isPlaying)
      label.textContent = isPlaying ? 'Pause' : failed ? 'Retry' : idleLabel
      button.setAttribute('aria-pressed', String(isPlaying))
      button.setAttribute(
        'aria-label',
        isPlaying ? `Pause audio story about ${audioTitle}` : failed ? `Retry audio story about ${audioTitle}` : `Listen to the personal story about ${audioTitle}`,
      )
      if (!isPlaying) updateRemainingTime()
    }

    button.addEventListener('click', async () => {
      if (pending) return
      if (audio.paused) {
        pending = true
        button.disabled = true
        const retry = failed || audio.error
        feedback('loading')
        let timeout
        try {
          document.querySelectorAll('[data-project-audio]').forEach((otherAudio) => {
            if (otherAudio !== audio) otherAudio.pause()
          })
          if (retry) audio.load()
          await Promise.race([
            audio.play(),
            new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Audio timed out')), 15000) }),
          ])
          setPlayingState(!audio.paused)
          feedback('ready')
        } catch {
          audio.pause()
          setPlayingState(false)
          feedback('error')
        } finally {
          clearTimeout(timeout)
          pending = false
          button.disabled = false
        }
        return
      }

      audio.pause()
      setPlayingState(false)
    })

    audio.addEventListener('ended', () => {
      audio.currentTime = 0
      setPlayingState(false)
    })
    audio.addEventListener('pause', () => setPlayingState(false))
    audio.addEventListener('error', () => {
      setPlayingState(false)
      feedback('error')
    })
    audio.addEventListener('waiting', () => { if (!failed) feedback('loading') })
    audio.addEventListener('playing', () => feedback('ready'))
    audio.addEventListener('loadedmetadata', updateRemainingTime)
    audio.addEventListener('timeupdate', updateRemainingTime)
    updateRemainingTime()
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

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let animation = null
    let revision = 0

    function transition(open, instant = false) {
      if (!open && !modal.open) return
      const current = ++revision
      const wasOpen = modal.open
      const style = wasOpen ? getComputedStyle(modal) : null
      const from = { opacity: style?.opacity ?? '0', transform: style?.transform ?? 'translateY(8px)' }
      animation?.cancel()
      modal.classList.toggle('is-closing', !open)
      modal.classList.toggle('is-instant', instant || reduced.matches)
      if (open && !wasOpen) {
        modal.showModal()
        modal.scrollTop = 0
        closeButton.focus({ preventScroll: true })
      }
      const finish = () => {
        if (current !== revision) return
        animation?.cancel()
        animation = null
        if (!open) {
          modal.close()
          modal.classList.remove('is-closing')
          openButton.focus({ preventScroll: true })
        }
      }
      if (instant || reduced.matches) return finish()
      animation = modal.animate([from, {
        opacity: open ? 1 : 0,
        transform: open ? 'translateY(0)' : 'translateY(6px)',
      }], { duration: open ? 220 : 160, easing: 'cubic-bezier(0.32, 0.08, 0.24, 1)', fill: 'both' })
      animation.finished.then(finish, () => {})
    }

    function closeTranscript(event) {
      transition(false, event?.type === 'cancel' || event?.detail === 0)
    }

    openButton.addEventListener('click', (event) => transition(true, event.detail === 0))

    closeButton.addEventListener('click', closeTranscript)

    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeTranscript()
    })

    modal.addEventListener('cancel', (event) => {
      event.preventDefault()
      closeTranscript(event)
    })

    modal.addEventListener('close', () => {
      if (modal.open) return // A queued close event can arrive after reopening.
      revision++
      animation?.cancel()
      animation = null
    })
  })
}
