import assert from 'node:assert/strict'
import { before, after, describe, test } from 'node:test'
import { preview } from 'vite'
import { chromium, webkit } from 'playwright'

let server, base
before(async () => {
  server = await preview({ logLevel: 'error', preview: { host: '127.0.0.1', port: 0 } })
  base = `http://127.0.0.1:${server.httpServer.address().port}`
})
after(async () => { if (server) await new Promise(resolve => server.httpServer.close(resolve)) })

for (const engine of (process.env.TEST_BROWSERS ?? 'chromium').split(',')) {
  describe(`FINN logo morph: ${engine}`, () => {
    let browser
    before(async () => { browser = await ({ chromium, webkit })[engine].launch() })
    after(async () => browser?.close())
    async function visit(t, options = {}) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', ...options })
      t.after(() => context.close())
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      t.after(() => assert.deepEqual(errors, []))
      await page.goto(`${base}/finn/`)
      await page.locator('[data-logo-morph][data-ready="true"]').waitFor()
      return page
    }
    const settled = page => page.waitForFunction(() => document.querySelector('[data-logo-morph]').dataset.animating === 'false')
    const state = page => page.locator('[data-logo-morph]').getAttribute('data-logo-state')

    test('media order, original artwork and centered 16:9 controls fit desktop and mobile', async t => {
      for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
        const page = await visit(t, { viewport })
        const group = page.locator('[data-logo-morph]')
        const stack = page.locator('.case-media-stack').last()
        assert.equal(await stack.locator(':scope > :first-child img').getAttribute('src'), '/images/finn-home-imac-v1.jpg')
        assert.equal(await stack.locator(':scope > :nth-child(2) [data-logo-morph]').count(), 1)
        assert.equal(await page.locator('img[src$="finn-18.jpg"], img[src$="finn-property-viewing-v1.jpg"]').count(), 0)
        await group.scrollIntoViewIfNeeded()
        assert.equal(await state(page), 'original')
        const layout = await group.evaluate(el => {
          const b = el.getBoundingClientRect(), tabs = el.querySelector('[role="tablist"]').getBoundingClientRect()
          return { ratio: b.width / b.height, centered: (tabs.left + tabs.right - b.left - b.right) / 2,
            fits: tabs.left >= b.left && tabs.right <= b.right, background: getComputedStyle(el).backgroundColor,
            overflow: document.documentElement.scrollWidth > innerWidth }
        })
        assert.ok(Math.abs(layout.ratio - 16 / 9) < .01)
        assert.ok(Math.abs(layout.centered) < 1)
        assert.ok(layout.fits)
        assert.equal(layout.background, 'rgb(65, 149, 247)')
        assert.equal(layout.overflow, false)
        const widths = []
        for (const [i, name] of ['original', 'new', 'mobile'].entries()) {
          await group.getByRole('tab').nth(i).click()
          assert.equal(await state(page), name)
          assert.equal(await group.getByRole('tab', { selected: true }).count(), 1)
          assert.equal(await group.getByRole('tabpanel').getAttribute('aria-labelledby'), `finn-logo-tab-${i}`)
          widths.push(await group.locator('[data-logo-drawing]').evaluate(el => el.getBoundingClientRect().width))
          assert.equal(await group.locator('[data-logo-layer="f"]').getAttribute('opacity'), i === 2 ? '0' : '1')
        }
        assert.ok(widths[2] < widths[1] * .75, 'mobile symbol narrows instead of scaling to the wordmark width')
        await group.getByRole('tab').last().focus()
        await page.keyboard.press('ArrowRight')
        assert.equal(await state(page), 'original')
        assert.equal(await group.getByRole('tab').first().evaluate(el => el === document.activeElement), true)
        assert.ok(page.url().endsWith('/finn/'), 'tab keys do not navigate between cases')
      }
    })

    test('autoplay starts on entry, loops through all three shapes and manual selection stays in control', async t => {
      const page = await visit(t, { reducedMotion: 'no-preference' })
      const group = page.locator('[data-logo-morph]')
      assert.equal(await state(page), 'original', 'offscreen panel retains its first frame')
      await group.scrollIntoViewIfNeeded()
      await page.waitForFunction(() => document.querySelector('[data-logo-morph]').dataset.animating === 'true')
      assert.equal(await state(page), 'new')
      const path = group.locator('[data-logo-layer="left-pocket"]')
      const start = await path.getAttribute('d')
      await page.waitForTimeout(220)
      assert.notEqual(await path.getAttribute('d'), start, 'paths morph, rather than only swapping or crossfading assets')
      await page.waitForFunction(() => document.querySelector('[data-logo-morph]').dataset.logoState === 'mobile')
      await page.waitForFunction(() => document.querySelector('[data-logo-morph]').dataset.logoState === 'original')
      await group.getByRole('tab').nth(1).click()
      await page.waitForTimeout(180)
      await group.getByRole('tab').last().click()
      await page.waitForTimeout(100)
      await group.getByRole('tab').first().click()
      await settled(page)
      const finalPath = await path.getAttribute('d')
      assert.equal(await state(page), 'original')
      assert.equal(await group.getAttribute('data-autoplay'), 'off')
      await page.waitForTimeout(2800)
      assert.equal(await path.getAttribute('d'), finalPath)
      assert.equal(await state(page), 'original', 'automatic cycling never overrides manual choice')
    })

    test('offscreen motion pauses, reduced motion settles immediately, and leaving disposes the loop', async t => {
      const page = await visit(t, { reducedMotion: 'no-preference' })
      const group = page.locator('[data-logo-morph]')
      const path = group.locator('[data-logo-layer="right-pocket"]')
      await group.scrollIntoViewIfNeeded()
      await page.waitForFunction(() => document.querySelector('[data-logo-morph]').dataset.animating === 'true')
      await page.waitForTimeout(250)
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
      await page.waitForTimeout(100)
      const paused = await path.getAttribute('d')
      await page.waitForTimeout(450)
      assert.equal(await path.getAttribute('d'), paused)
      await group.scrollIntoViewIfNeeded()
      await page.waitForTimeout(180)
      assert.notEqual(await path.getAttribute('d'), paused)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await settled(page)
      const reduced = await path.getAttribute('d')
      await page.waitForTimeout(300)
      assert.equal(await path.getAttribute('d'), reduced)
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      const detached = await path.elementHandle()
      await page.keyboard.press('ArrowRight')
      await page.waitForURL(`${base}/uber/`)
      const disposed = await detached.getAttribute('d')
      await page.waitForTimeout(500)
      assert.equal(await detached.getAttribute('d'), disposed, 'unmounted case stops writing animation frames')
    })
  })
}
