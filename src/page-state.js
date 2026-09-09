export function createPageStateContent(status, onRetry) {
  const content = document.createElement('div')
  content.className = 'page-state__content'
  content.innerHTML = `
    <div class="page-state__mark" aria-hidden="true">
      <img src="/images/dragonmark.svg" alt="" width="77" height="57" />
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
