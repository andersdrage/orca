import { chromium } from 'playwright'
import { preview } from 'vite'
import { writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
const server = await preview({ build: { outDir: process.env.DRAGON_TEST_DIST || 'dist' }, logLevel: 'error', preview: { host: '127.0.0.1', port: 0 } })
const browser = await chromium.launch()
const results = []
try {
  for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2, reducedMotion: 'no-preference' })
    const scripts = new Map()
    let recording = false
    page.on('response', async response => {
      if (recording && /\.js($|\?)/.test(response.url())) {
        const body = await response.body().catch(() => Buffer.alloc(0))
        scripts.set(response.url(), { raw: body.length, gzip: gzipSync(body).length })
      }
    })
    await page.addInitScript(() => {
      window.footerProfile = { draws: 0, triangles: 0, tasks: [] }
      for (const type of [WebGLRenderingContext, WebGL2RenderingContext]) for (const name of ['drawArrays', 'drawElements']) {
        const original = type.prototype[name]
        type.prototype[name] = function(...args) {
          window.footerProfile.draws++
          if (args[0] === this.TRIANGLES) window.footerProfile.triangles += (name === 'drawArrays' ? args[2] : args[1]) / 3
          return original.apply(this, args)
        }
      }
      new PerformanceObserver(list => window.footerProfile.tasks.push(...list.getEntries().map(e => ({ start: e.startTime, duration: e.duration })))).observe({ type: 'longtask', buffered: true })
    })
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/micromilspec/`)
    await page.waitForTimeout(400)
    recording = true
    const started = await page.evaluate(() => performance.now())
    await page.locator('.site-footer').scrollIntoViewIfNeeded()
    await page.waitForSelector('.footer-dragon-canvas[data-ready="true"]')
    const ready = await page.evaluate(() => performance.now())
    await page.waitForTimeout(300)
    await page.evaluate(() => { window.footerProfile.draws = window.footerProfile.triangles = 0; window.footerProfile.sampleStart = performance.now() })
    await page.waitForTimeout(3000)
    const metrics = await page.evaluate(started => ({ ...window.footerProfile, sampleMs: performance.now() - window.footerProfile.sampleStart, tasks: window.footerProfile.tasks.filter(t => t.start >= started) }), started)
    results.push({ viewport: name, readyMs: Math.round(ready - started), startupLongTasks: metrics.tasks.length, longestTaskMs: Math.round(Math.max(0, ...metrics.tasks.map(t => t.duration))), drawsPerSecond: +(metrics.draws * 1000 / metrics.sampleMs).toFixed(1), trianglesPerSecond: Math.round(metrics.triangles * 1000 / metrics.sampleMs), lazyJsRawBytes: [...scripts.values()].reduce((s, v) => s + v.raw, 0), lazyJsGzipBytes: [...scripts.values()].reduce((s, v) => s + v.gzip, 0) })
    await page.close()
  }
  console.log(JSON.stringify(results, null, 2))
  if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(results, null, 2) + '\n')
} finally { await browser.close(); await new Promise(resolve => server.httpServer.close(resolve)) }
