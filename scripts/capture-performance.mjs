import { chromium } from 'playwright'
import fs from 'node:fs/promises'
const stage = process.argv[2] || 'before'
const dir = `screenshots/2026-09-09_performance-${stage}`
await fs.mkdir(dir, { recursive: true })
const browser = await chromium.launch()
for (const [width, height] of [[1440, 900], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width, height } })
  await page.addInitScript(() => {
    addEventListener('pagereveal', e => {
      if (!e.viewTransition) return
      e.viewTransition.ready.then(() => {
        window.captureAnimations = document.getAnimations()
        window.captureAnimations.forEach(a => { a.pause(); a.currentTime = 110 })
      }, () => {})
    })
  })
  await page.goto('http://localhost:4176/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${dir}/${width}-map.png` })
  await page.waitForTimeout(5000)
  await page.screenshot({ path: `${dir}/${width}-index.png` })
  const tile = page.locator('.timeline-copy[data-copy="1"] [data-tile-id="hjemla"]')
  await tile.evaluate(el => el.closest('[data-timeline]').scrollTo({ left: el.offsetLeft - (innerWidth - el.offsetWidth) / 2, behavior: 'instant' }))
  await page.waitForTimeout(900)
  await tile.click()
  await page.waitForURL('**/hjemla/')
  await page.waitForFunction(() => window.captureAnimations?.length > 0)
  await page.screenshot({ path: `${dir}/${width}-entry-110ms.png` })
  await page.evaluate(() => window.captureAnimations.forEach(a => { a.currentTime = 200 }))
  await page.screenshot({ path: `${dir}/${width}-entry-200ms.png` })
  await page.evaluate(() => window.captureAnimations.forEach(a => a.finish()))
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${dir}/${width}-case.png` })
  await page.locator('.case-close').click()
  await page.waitForURL('http://localhost:4176/')
  await page.waitForFunction(() => window.captureAnimations?.length > 0)
  await page.screenshot({ path: `${dir}/${width}-return-110ms.png` })
  await page.evaluate(() => window.captureAnimations.forEach(a => { a.currentTime = 200 }))
  await page.screenshot({ path: `${dir}/${width}-return-200ms.png` })
  await page.evaluate(() => window.captureAnimations.forEach(a => a.finish()))
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${dir}/${width}-returned.png` })
  await page.close()
}
const small = await browser.newPage({ viewport: { width: 320, height: 568 }, reducedMotion: 'reduce' })
await small.goto('http://localhost:4176/finn/')
await small.evaluate(() => document.fonts.ready)
await small.screenshot({ path: `${dir}/finn-320.png` })
await small.close()
await browser.close()
await fs.writeFile(`${dir}/README.md`, `${stage}: opening map, settled index, project entry and return frozen at 110ms and 200ms, settled case and return. Desktop 1440×900 and mobile 390×844; FINN at 320×568. Captured separately from performance timing runs.\n`)
