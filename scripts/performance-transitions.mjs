// Run against a production preview, with no video/screenshot capture in timed runs.
import { chromium, webkit } from 'playwright'
import fs from 'node:fs/promises'
const label = process.argv[2] || 'baseline'
const base = process.env.PERF_BASE || 'http://localhost:4176'
const folder = `screenshots/2026-09-09_performance-${label}`
await fs.mkdir(folder, { recursive: true })
const results = []
for (const engine of (process.env.PERF_ENGINES || 'chromium,webkit').split(',')) {
  const browser = await ({ chromium, webkit })[engine].launch({ headless: process.env.PERF_HEADED !== '1' })
  const viewports = process.env.PERF_VIEWPORTS === 'desktop' ? [[1440, 900]] : process.env.PERF_VIEWPORTS === 'mobile' ? [[390, 844]] : [[1440, 900], [390, 844]]
  for (const [width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: Number(process.env.PERF_DPR || 1) })
    const samples = []
    await context.exposeBinding('reportFrames', (_, result) => samples.push(result))
    await context.addInitScript(() => {
      let last, frames = [], tasks = [], transitions = [], lastPhase = ''
      let animationScan = 0
      const seen = new WeakSet()
      const phase = () => document.body?.classList.contains('world-map-intro') ? 'opening-map'
        : document.querySelector('.is-entering-home') ? 'opening-tiles'
        : document.documentElement.classList.contains('vt-presentation-in') ? 'entry'
        : document.documentElement.classList.contains('vt-presentation-out') ? 'return' : 'idle'
      const tick = now => {
        const current = phase()
        if (current !== 'idle' && now - animationScan > 100) {
          animationScan = now
          for (const a of document.getAnimations()) {
            const name = a.animationName || a.id
            if (!/^(project-|world-camera|world-card|map-card|entrance-)/.test(name) || seen.has(a)) continue
            seen.add(a)
            a.ready.then(() => {
              const timing = a.effect.getTiming()
              if (typeof a.startTime === 'number' && typeof timing.duration === 'number') {
                const start = a.startTime + timing.delay / a.playbackRate
                performance.mark(`perf-range:${name}:${(start - performance.now()).toFixed(3)}:${(timing.duration / a.playbackRate).toFixed(3)}`)
              }
            }, () => {})
          }
        }
        if (current !== lastPhase) {
          performance.mark(`perf-phase:${current}`)
        }
        if (last && current === lastPhase) frames.push({ phase: current, dt: now - last, at: now })
        last = now; lastPhase = current; requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
      try { new PerformanceObserver(list => tasks.push(...list.getEntries().map(t => ({ start: t.startTime, duration: t.duration })))).observe({ type: 'longtask', buffered: true }) } catch {}
      addEventListener('pagereveal', e => {
        if (!e.viewTransition) return
        const start = performance.now()
        e.viewTransition.ready.then(() => transitions.push({ ready: performance.now() - start }), () => transitions.push({ skipped: true }))
      })
      window.flushFrames = () => {
        window.reportFrames({ path: location.pathname, frames, tasks, transitions })
        frames = []; tasks = []; transitions = []
      }
      addEventListener('pageswap', window.flushFrames)
    })
    const page = await context.newPage()
    page.setDefaultTimeout(15000)
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    let cdp
    if (engine === 'chromium' && width === 1440 && process.env.PERF_TRACE === '1') {
      cdp = await context.newCDPSession(page)
      await cdp.send('Tracing.start', { categories: 'devtools.timeline,blink.user_timing,disabled-by-default-devtools.timeline.frame', transferMode: 'ReturnAsStream' })
    }
    await page.goto(base, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(5700)
    await page.evaluate(() => window.flushFrames())
    const ids = process.env.PERF_CASES === 'none' ? [] : (process.env.PERF_CASES || 'micromilspec,hjemla,boligmappa,finn,uber,off-market,houeland,nettavisen,hjemla,boligmappa').split(',')
    const clicks = []
    for (const id of ids) {
      console.error(`${label}: ${engine} ${width} ${id}`)
      const tile = page.locator(`.timeline-copy[data-copy="1"] [data-tile-id="${id}"]`)
      await tile.evaluate(el => {
        const scroller = el.closest('[data-timeline]')
        scroller.dispatchEvent(new WheelEvent('wheel'))
        scroller.scrollTo({ left: el.offsetLeft - (innerWidth - el.offsetWidth) / 2, behavior: 'instant' })
      })
      await page.waitForTimeout(650)
      const point = () => page.locator(`[data-tile-id="${id}"]`).evaluateAll(tiles => {
        const r = tiles.map(t => t.getBoundingClientRect()).find(r => r.right > 20 && r.left < innerWidth - 20)
        if (!r) throw new Error('No visible project thumbnail')
        return { x: Math.max(20, Math.min(innerWidth - 20, r.left + r.width / 2)), y: r.top + r.height / 2 }
      })
      let at = await point()
      await page.mouse.move(at.x, at.y)
      await page.waitForTimeout(180)
      const start = Date.now()
      at = await point()
      await page.mouse.click(at.x, at.y)
      await page.waitForURL(`${base}/${id}/`, { waitUntil: 'domcontentloaded' })
      clicks.push({ id, ms: Date.now() - start })
      await page.waitForTimeout(800)
      await page.evaluate(() => window.flushFrames())
      await page.locator('.case-close').click()
      await page.waitForURL(`${base}/`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(750)
      await page.evaluate(() => window.flushFrames())
    }
    if (cdp) {
      const done = new Promise(resolve => cdp.once('Tracing.tracingComplete', resolve))
      await cdp.send('Tracing.end')
      const { stream } = await done
      let trace = '', eof = false
      while (!eof) { const chunk = await cdp.send('IO.read', { handle: stream }); trace += chunk.data; eof = chunk.eof }
      await cdp.send('IO.close', { handle: stream })
      await fs.writeFile(`${folder}/chromium-trace.json`, trace)
    }
    const phases = {}
    for (const phase of ['opening-map', 'opening-tiles', 'entry', 'return', 'idle']) {
      const times = samples.flatMap(s => s.frames).filter(f => f.phase === phase).map(f => f.dt).sort((a, b) => a - b)
      phases[phase] = { frames: times.length, p95: times[Math.floor(times.length * .95)], worst: times.at(-1), over25ms: times.filter(t => t > 25).length }
    }
    const row = { engine, width, dpr: Number(process.env.PERF_DPR || 1), headed: process.env.PERF_HEADED === '1', phases, clicks, longTasks: samples.flatMap(s => s.tasks), transitions: samples.flatMap(s => s.transitions), errors }
    results.push(row)
    await fs.writeFile(`${folder}/summary.json`, JSON.stringify(results, null, 2))
    await fs.writeFile(`${folder}/${engine}-${width}-raw.json`, JSON.stringify(samples))
    console.log(JSON.stringify(row))
    await context.close()
  }
  await browser.close()
}
await fs.writeFile(`${folder}/summary.json`, JSON.stringify(results, null, 2))
