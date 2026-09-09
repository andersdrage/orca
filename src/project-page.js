const pages = new Map()

// Intent warmup and navigation share the same bounded set of case documents.
// A failed request is evicted so an ordinary click can retry.
export function prepareProjectPage(href) {
  const url = new URL(href, location.href)
  if (pages.has(url.pathname)) return pages.get(url.pathname)
  const pending = fetch(url.href, { signal: AbortSignal.timeout(8000), headers: { Accept: 'text/html' } })
    .then(async response => {
      if (!response.ok) throw new Error(`Project request failed: ${response.status}`)
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html')
      const root = doc.querySelector('[data-case-root]')
      const layout = doc.querySelector('#site-layout')
      if (!layout || root?.dataset.caseId !== url.pathname.split('/')[1]) throw new Error('Invalid project document')
      return doc
    }).catch(error => { pages.delete(url.pathname); throw error })
  pages.set(url.pathname, pending)
  return pending
}
