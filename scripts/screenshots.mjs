/* Iterasjons-skjermbilder: `npm run screenshots -- <label>`
   Krever at dev-serveren kjører (npm run dev). Lagrer til screenshots/<dato>_<tid>_<label>/. */

import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const BASE = process.env.SCREENSHOT_BASE ?? 'http://localhost:5173'
const label = process.argv[2] ?? 'iteration'

const now = new Date()
const pad = (n) => String(n).padStart(2, '0')
const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`
const dir = `screenshots/${stamp}_${label}`

/* fullPage: false for forsiden — den er en horisontal viewport uten vertikal scroll.
   About/Praise ligger i kamera-verdenen (body scroller ikke) — der skytes hele
   innholdskolonnen som element i stedet. */
const targets = [
  { path: '/', name: 'home', fullPage: false },
  { path: '/micromilspec/', name: 'micromilspec', fullPage: true },
  { path: '/hjemla/', name: 'hjemla', fullPage: true },
  { path: '/off-market/', name: 'off-market', fullPage: true },
  { path: '/hmkg/', name: 'hmkg', fullPage: true },
  { path: '/misc/', name: 'misc', fullPage: true },
  { path: '/mountain-milk/', name: 'mountain-milk', fullPage: true },
  { path: '/humming-people/', name: 'humming-people', fullPage: true },
  { path: '/finn/', name: 'finn', fullPage: true },
  { path: '/brathwait/', name: 'brathwait', fullPage: true },
  { path: '/about/', name: 'about', element: '.world-page[data-path="/about/"] .world-column' },
  { path: '/praise/', name: 'praise', element: '.world-page[data-path="/praise/"] .world-column' },
  { path: '/archive/', name: 'archive', element: '.world-page[data-path="/archive/"] .world-column' },
  { path: '/people/', name: 'people', element: '.world-page[data-path="/people/"] .world-column' },
]

const viewports = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
]

/* Scroll gjennom siden så lazy-bilder rekker å laste før fullPage-skjermbildet. */
async function loadLazyMedia(page) {
  await page.evaluate(async () => {
    const step = window.innerHeight
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((resolve) => setTimeout(resolve, 120))
    }
    window.scrollTo(0, 0)
  })
  /* Ikke networkidle — videoer på flere MB streamer lenge og holder nettverket opptatt. */
  await page.waitForTimeout(800)
}

await mkdir(dir, { recursive: true })
const browser = await chromium.launch()

for (const { name: vpName, ...contextOptions } of viewports) {
  const context = await browser.newContext(contextOptions)
  const page = await context.newPage()

  for (const target of targets) {
    await page.goto(`${BASE}${target.path}`, { waitUntil: 'load' })
    await page.waitForTimeout(600)
    if (target.fullPage) await loadLazyMedia(page)
    const file = `${dir}/${target.name}-${vpName}.png`
    if (target.element) {
      await page.locator(target.element).screenshot({ path: file })
    } else {
      await page.screenshot({ path: file, fullPage: target.fullPage })
    }
    console.log(`✓ ${file}`)
  }

  await context.close()
}

await browser.close()
console.log(`\nLagret i ${dir}/`)
