const MARK = '/images/dragon-error-mark-v1'
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

export function createPageStateContent(status, onRetry) {
  const content = document.createElement('div')
  content.className = 'page-state__content'
  content.innerHTML = `
    <div class="page-state__mark" aria-hidden="true">
      <img src="${MARK}-poster.webp" alt="" width="448" height="320" />
      <video muted loop playsinline preload="none" data-page-state-video="${MARK}.mp4" tabindex="-1" disablepictureinpicture disableremoteplayback></video>
    </div>
    <p class="page-state__story">HC SVNT DRACONES</p>`

  const message = document.createElement('p')
  message.className = 'page-state__message'
  message.setAttribute('role', 'status')
  if (status === 'loading') message.textContent = 'Loading…'
  else {
    message.append('We couldn’t load this page.', document.createElement('br'), 'Please try again.')
  }
  content.append(message)

  if (status === 'error') {
    const retry = document.createElement('button')
    retry.className = 'page-state__action'
    retry.type = 'button'
    retry.textContent = 'Try again'
    retry.addEventListener('click', onRetry)
    content.append(retry)
  }
  return content
}

export function syncPageStateMedia(root = document) {
  root.querySelectorAll('[data-page-state-video]').forEach((video) => {
    const mark = video.parentElement
    const active = !document.hidden && !reducedMotion.matches && !video.closest('[inert]')
    if (!active) {
      video.pause()
      mark.classList.remove('is-playing')
      return
    }
    if (!video.getAttribute('src')) {
      video.muted = true
      video.src = video.dataset.pageStateVideo
    }
    if (!video.paused) return
    video.play().then(() => {
      if (video.isConnected && !video.paused) mark.classList.add('is-playing')
    }).catch(() => {
      // Offline, blocked autoplay or unsupported decoding leaves the still intact.
      mark.classList.remove('is-playing')
    })
  })
}

reducedMotion.addEventListener('change', () => syncPageStateMedia())
document.addEventListener('visibilitychange', () => syncPageStateMedia())
