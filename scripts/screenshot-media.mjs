/* Shared by manual screenshot capture and its production-preview regression test.
   Only scrolls the current page; never changes application content or styles. */
export async function loadLazyMedia(page, { timeoutMs = 10000 } = {}) {
  return page.evaluate(async ({ timeoutMs }) => {
    const scroller = document.querySelector('.world-page:not([inert])') ?? document.scrollingElement
    const scope = scroller === document.scrollingElement ? document : scroller
    const loaded = new Set()
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    const bounded = async (promise, description) => {
      let timer
      try {
        return await Promise.race([
          promise,
          new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`Screenshot timed out: ${description}`)), timeoutMs) }),
        ])
      } finally { clearTimeout(timer) }
    }
    await bounded(document.fonts.ready, 'fonts')
    const decodeVisible = async () => {
      const images = [...scope.querySelectorAll('img')].filter((img) => {
        const r = img.getBoundingClientRect()
        return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth
      })
      await Promise.all(images.map(async (img) => {
        const source = img.getAttribute('src') ?? img.dataset.mediaSrc
        if (!source) return
        await bounded((async () => {
          // Deferred archive sources are assigned by the page's visibility manager.
          const deadline = Date.now() + timeoutMs
          while (!img.hasAttribute('src') && Date.now() < deadline) await wait(30)
          if (!img.hasAttribute('src')) throw new Error(`Screenshot timed out: ${source}`)
          try { await img.decode() } catch { throw new Error(`Screenshot image failed: ${source}`) }
          loaded.add(source)
        })(), source)
      }))
    }
    try {
      const step = scroller.clientHeight * 0.8
      let y = 0
      while (true) {
        scroller.scrollTo({ top: y, behavior: 'instant' })
        await wait(120)
        await decodeVisible()
        const end = scroller.scrollHeight - scroller.clientHeight
        if (y >= end) break
        y = Math.min(y + step, end)
      }
    } finally {
      scroller.scrollTo({ top: 0, behavior: 'instant' })
    }
    await wait(120)
    await decodeVisible()
    return { scroller: scope === document ? 'document' : 'world', loadedImages: loaded.size }
  }, { timeoutMs })
}
