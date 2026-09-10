/* Iterasjons-skjermbilder: `npm run screenshots -- <label>`
   Krever en kjørende dev- eller preview-server. Lagrer til screenshots/<dato>_<tid>_<label>/. */

import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
import { loadLazyMedia } from './screenshot-media.mjs'

const BASE = process.env.SCREENSHOT_BASE ?? 'http://localhost:5173'
const label = process.argv[2] ?? 'iteration'

const now = new Date()
const pad = (n) => String(n).padStart(2, '0')
const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`
const dir = `screenshots/${stamp}_${label}`

/* The world is sized in viewport units. Element screenshots of a long column
   enlarge the viewport and can reveal neighbouring cells. Capture world routes
   as overlapping viewport frames; ordinary case documents can use fullPage. */
let targets = [
  { path: '/', name: 'home', fullPage: false },
  { path: '/micromilspec/', name: 'micromilspec', fullPage: true },
  { path: '/houeland/', name: 'houeland', fullPage: true },
  { path: '/hjemla/', name: 'hjemla', fullPage: true },
  { path: '/off-market/', name: 'off-market', fullPage: true },
  { path: '/finn/', name: 'finn', fullPage: true },
  { path: '/nettavisen/', name: 'nettavisen', fullPage: true },
  { path: '/uber/', name: 'uber', fullPage: true },
  { path: '/boligmappa/', name: 'boligmappa', fullPage: true },
  { path: '/about/', name: 'about', world: true },
  { path: '/praise/', name: 'praise', world: true },
  { path: '/timeline/', name: 'timeline', world: true },
  { path: '/people/', name: 'people', world: true },
  { path: '/archived-work/', name: 'archived-work', world: true },
]

let viewports = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
]

// Optional exact filters keep focused visual checks quick and reproducible.
function select(items, requested, key) {
  if (!requested) return items
  const values = requested.split(',')
  for (const value of values) {
    if (!items.some((item) => item[key] === value)) throw new Error(`Unknown screenshot ${key}: ${value}`)
  }
  return items.filter((item) => values.includes(item[key]))
}
targets = select(targets, process.env.SCREENSHOT_ROUTES, 'path')
viewports = select(viewports, process.env.SCREENSHOT_VIEWPORTS, 'name')

await mkdir(dir, { recursive: true })
const browser = await chromium.launch()

try {
  for (const { name: vpName, ...contextOptions } of viewports) {
    const context = await browser.newContext({ ...contextOptions, reducedMotion: 'reduce' })
    const page = await context.newPage()

    for (const target of targets) {
      await page.goto(`${BASE}${target.path}`, { waitUntil: 'load' })
      await page.waitForTimeout(600)
      if (target.fullPage || target.world) await loadLazyMedia(page)
      const stem = `${dir}/${target.name}-${vpName}`
      if (target.world) {
        const scroller = page.locator('.world-page:not([inert])')
        let y = 0
        let frame = 1
        try {
          while (true) {
            await scroller.evaluate((el, top) => el.scrollTo({ top, behavior: 'instant' }), y)
            await page.waitForTimeout(120)
            const file = `${stem}${frame === 1 ? '' : `-${String(frame).padStart(2, '0')}`}.png`
            await page.screenshot({ path: file, fullPage: false })
            console.log(`✓ ${file}`)
            const { height, end } = await scroller.evaluate((el) => ({ height: el.clientHeight, end: el.scrollHeight - el.clientHeight }))
            if (y >= end) break
            y = Math.min(y + height * 0.8, end)
            frame++
          }
        } finally {
          await scroller.evaluate((el) => { el.scrollTop = 0 })
        }
      } else {
        const file = `${stem}.png`
        await page.screenshot({ path: file, fullPage: target.fullPage })
        console.log(`✓ ${file}`)
      }
    }

    await context.close()
  }
} finally {
  await browser.close()
}
console.log(`\nLagret i ${dir}/`)
