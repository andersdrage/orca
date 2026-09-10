import assert from 'node:assert/strict'
import { before, after, describe, test } from 'node:test'
import { preview } from 'vite'
import { chromium, webkit } from 'playwright'
import { FEATURED_ORDER } from '../src/case-navigation.js'
let server, base
before(async () => {
  server = await preview({ logLevel: 'error', preview: { host: '127.0.0.1', port: 0 } })
  base = `http://127.0.0.1:${server.httpServer.address().port}`
})
after(async () => new Promise(resolve => server.httpServer.close(resolve)))
for (const engine of (process.env.TEST_BROWSERS ?? 'chromium').split(',')) {
  describe(engine, () => {
    let browser
    before(async () => { browser = await ({ chromium, webkit })[engine].launch() })
    after(async () => browser.close())
    async function visit(t, path, options = {}) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', ...options })
      t.after(() => context.close())
      const page = await context.newPage()
      page.setDefaultTimeout(15000)
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      t.after(() => assert.deepEqual(errors, []))
      await page.goto(base + path)
      return page
    }
    const bottom = page => page.locator('.site-footer').first().evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'end' }))
    test('light footer follows the page with a smaller dragon and readable mobile links', async t => {
      for (const width of [1440, 390]) {
        const page = await visit(t, '/boligmappa/', { viewport: { width, height: width === 390 ? 844 : 900 } })
        await bottom(page)
        const styles = await page.locator('.site-footer').evaluate(el => ({
          position: getComputedStyle(el).position,
          background: getComputedStyle(el).backgroundColor,
          body: getComputedStyle(document.body).backgroundColor,
          media: getComputedStyle(document.querySelector('.case-below')).backgroundColor,
          shadow: getComputedStyle(document.querySelector('#work'), '::before').boxShadow,
          overflow: document.documentElement.scrollWidth > innerWidth,
          text: getComputedStyle(el.querySelector('.site-footer__story')).color,
        }))
        assert.equal(styles.position, 'relative')
        assert.equal(styles.background, styles.body)
        assert.equal(styles.background, styles.media)
        assert.equal(styles.shadow, 'none')
        assert.equal(styles.overflow, false)
        assert.equal(styles.text, 'rgb(82, 82, 91)')
        await page.waitForSelector('.footer-dragon-canvas[data-ready="true"]')
        assert.equal(await page.locator('.footer-dragon-canvas').isVisible(), true)
        assert.equal(await page.locator('.site-footer video').count(), 0)
        assert.equal(await page.locator('.site-footer__dragon').evaluate(el => el.getBoundingClientRect().width), width === 390 ? 84 : 120)
        const initial = await page.locator('.site-footer').evaluate(el => el.getBoundingClientRect().top)
        await page.evaluate(() => scrollBy({ top: -100, behavior: 'instant' }))
        const shifted = await page.locator('.site-footer').evaluate(el => el.getBoundingClientRect().top)
        assert.ok(Math.abs(shifted - initial - 100) < 2, 'footer scrolls with the document')

      }
    })
    test('case backgrounds persist through direct visits, thumbnail entry, Back, and sibling footer mounting', async t => {
      const page = await visit(t, '/')
      await page.waitForFunction(() => document.querySelectorAll('.timeline-tile img').length > 0)
      await page.evaluate(() => document.querySelector('[data-tile-id="finn"]').click())
      await page.waitForURL('**/finn/')
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(250, 250, 250)')
      await page.goBack()
      await page.waitForFunction(() => !!document.querySelector('.world-page:not([inert])'))
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(250, 250, 250)')
      for (const id of FEATURED_ORDER) {
        await page.goto(base + `/${id}/`)
        const surface = ['houeland', 'uber'].includes(id) ? 'rgb(233, 233, 233)' : ['boligmappa', 'nettavisen'].includes(id) ? 'rgb(218, 218, 218)' : 'rgb(250, 250, 250)'
        assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), surface)
        assert.equal(await page.locator('.site-footer').evaluate(el => getComputedStyle(el).backgroundColor), surface)
      }
      await page.goto(base + '/about/')
      await page.waitForFunction(() => document.querySelector('.world-page[data-path="/praise/"] .site-footer__dragon'))
      assert.equal(await page.locator('.world-page[data-path="/praise/"] .site-footer__dragon').count(), 1)
      assert.equal(await page.locator('.world-page[data-path="/about/"] .site-footer__dragon').count(), 1)
      await page.locator('.world-page[data-path="/about/"] .site-footer').evaluate(el => el.scrollIntoView({ behavior: 'instant' }))
    })
  })
}
