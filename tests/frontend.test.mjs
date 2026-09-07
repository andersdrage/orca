import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { preview } from 'vite'
import { chromium, webkit } from 'playwright'

const worldPaths = ['/', '/about/', '/praise/', '/history/', '/people/', '/archived-work/']
const casePaths = ['/micromilspec/', '/hjemla/', '/off-market/', '/boligmappa/', '/finn/', '/nettavisen/', '/uber/', '/hmkg/', '/humming-people/', '/brathwait/', '/mountain-milk/']
let server
let base

before(async () => {
  server = await preview({ logLevel: 'error', preview: { host: '127.0.0.1', port: 0 } })
  base = `http://127.0.0.1:${server.httpServer.address().port}`
})
after(async () => {
  if (server) await new Promise((resolve) => server.httpServer.close(resolve))
})

for (const engine of (process.env.TEST_BROWSERS ?? 'chromium').split(',')) {
  describe(engine, { concurrency: false }, () => {
    let browser
    before(async () => {
      assert.ok(['chromium', 'webkit'].includes(engine), 'Choose chromium or webkit')
      browser = await ({ chromium, webkit })[engine].launch()
    })
    after(async () => browser?.close())

    async function visit(t, path, options = {}, init) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', ...options })
      t.after(() => context.close())
      if (init) await context.addInitScript(init)
      const page = await context.newPage()
      page.setDefaultTimeout(10000)
      await page.goto(base + path, { waitUntil: 'domcontentloaded' })
      return page
    }

    async function ready(page, path) {
      await page.waitForFunction((path) => document.querySelector(`.world-page[data-path="${path}"]`)?.dataset.loadState === 'ready', path)
    }

    async function activeWorld(page, path) {
      await page.waitForFunction((path) => {
        const active = document.querySelector('.world-page:not([inert])')
        return active?.dataset.path === path && active.contains(document.activeElement)
      }, path)
      assert.equal(await page.locator('.world-page:not([inert])').count(), 1)
    }

    test('selected projects are named once and keyboard activation opens a case', async (t) => {
      const page = await visit(t, '/')
      const links = page.locator('.timeline-copy[data-copy="1"] a')
      assert.equal(await links.count(), 7)
      const names = await links.evaluateAll((links) => links.map((link) => link.getAttribute('aria-label')))
      assert.ok(names.every(Boolean))
      assert.equal(new Set(names).size, 7)
      for (const name of names) assert.equal(await page.getByRole('link', { name, exact: true }).count(), 1)
      assert.equal(await page.locator('.timeline-copy[aria-hidden="true"] a:not([tabindex="-1"])').count(), 0)
      await page.getByRole('link', { name: 'MICROMILSPEC', exact: true }).focus()
      await page.keyboard.press('Enter')
      await page.waitForURL('**/micromilspec/')
      assert.equal(await page.getByRole('button', { name: 'Close project and return to overview' }).count(), 1)
    })

    test('each world entry has unique IDs, one accessible main and a working skip link', async (t) => {
      const page = await visit(t, '/')
      for (const path of worldPaths) {
        await page.goto(base + path, { waitUntil: 'domcontentloaded' })
        await page.waitForFunction(() => document.querySelectorAll('.world-page[data-load-state="ready"]').length === 6)
        const ids = await page.locator('[id]').evaluateAll((nodes) => nodes.map((node) => node.id))
        assert.equal(new Set(ids).size, ids.length, `duplicate ID on ${path}`)
        assert.equal(await page.getByRole('main').count(), 1)
        await page.locator('.skip-link').focus()
        await page.keyboard.press('Enter')
        await activeWorld(page, path)
        assert.equal(await page.evaluate(() => document.activeElement.tagName), 'MAIN')
        for (let i = 0; i < 18; i++) {
          await page.keyboard.press(i < 9 ? 'Tab' : 'Shift+Tab')
          assert.equal(await page.evaluate(() => !!document.activeElement.closest('[inert]')), false)
        }
      }
    })

    test('world links, footer entry and Back/Forward move focus with the camera', async (t) => {
      const page = await visit(t, '/about/')
      await ready(page, '/praise/')
      await page.locator('.site-header a[href="/praise/"]').click()
      await activeWorld(page, '/praise/')
      await page.locator('.corner-links a[href="/people/"]').click()
      await activeWorld(page, '/people/')
      await page.locator('.world-page:not([inert]) .site-footer a[href="/archived-work/"]').click()
      await activeWorld(page, '/archived-work/')
      await page.locator('.skip-link').focus()
      await page.keyboard.press('Enter')
      assert.equal(await page.evaluate(() => document.activeElement.id), 'world-archived-work-content')
      await page.goBack()
      await activeWorld(page, '/people/')
      await page.goForward()
      await activeWorld(page, '/archived-work/')
    })

    test('History uses the new route and keeps only the English NSB entry', async (t) => {
      const page = await visit(t, '/history/')
      await ready(page, '/history/')
      assert.equal(await page.getByRole('main').getAttribute('aria-label'), 'History')
      assert.equal(await page.locator('.archive-name').filter({ hasText: 'NSB' }).count(), 1)
      assert.equal(await page.locator('.archive-name').filter({ hasText: 'NSB' }).textContent(), 'NSB Yearly Report')
      assert.equal(await page.locator('a[href="/archive/"]').count(), 0)
      await page.locator('.site-header a[href="/about/"]').click()
      await activeWorld(page, '/about/')
      await page.locator('.corner-links a[href="/history/"]').click()
      await activeWorld(page, '/history/')
      await page.goBack()
      await activeWorld(page, '/about/')
      await page.goForward()
      await activeWorld(page, '/history/')
    })

    test('retired URLs are not redirected and all moved work has one destination', async (t) => {
      const page = await visit(t, '/')
      assert.equal(await page.getByRole('link', { name: 'Miscellaneous work', exact: true }).count(), 0)
      for (const path of ['/misc', '/misc/', '/misc/index.html', '/archive', '/archive/', '/archive/index.html']) {
        const response = await page.request.get(base + path + '?from=bookmark', { maxRedirects: 0 })
        assert.equal(response.status(), 404)
        assert.equal(response.headers().location, undefined)
      }
      await page.goto(base + '/archived-work/')
      await ready(page, '/archived-work/')
      const grid = page.locator('[data-archived-grid]')
      assert.equal(await grid.locator('[data-project="kaos"] .archived-grid__name').textContent(), 'Shopift theme')
      assert.equal(await grid.locator('.archived-card__meta').textContent(), 'Miscellaneous work (2012–Present)')
      for (const [id, year] of [['agens', '2025'], ['aprila', '2018'], ['brevio', '2019'], ['nike', '2016'], ['pressworks', '2017'], ['mountain-milk', '2011']]) {
        assert.ok((await grid.locator(`[data-project="${id}"] .archived-grid__meta`).textContent()).includes(year))
      }
      for (const file of ['agens-1.png', 'misc-agens-1.jpg', 'misc-agens-2.jpg', 'misc-agens-3.jpg', 'misc-agens-4.jpg', 'misc-aprila.jpg', 'misc-brevio.jpg', 'misc-logos.jpg', 'misc-nike.jpg', 'misc-pressworks.jpg', 'pressworks-mobile-v1.jpg']) {
        assert.equal(await grid.locator(`img[src="/images/${file}"]`).count(), 1)
      }
      assert.equal(await grid.locator('img[src="/images/misc-nettavisen.jpg"]').count(), 0)
      await page.goto(base + '/nettavisen/')
      const moved = page.locator('img[src="/images/misc-nettavisen.jpg"]')
      assert.equal(await moved.count(), 1)
      await page.locator('.portfolio-item').filter({ has: moved }).scrollIntoViewIfNeeded()
      await page.waitForFunction(() => {
        const img = document.querySelector('img[src="/images/misc-nettavisen.jpg"]')
        return img.complete && img.naturalWidth > 0
      })
      assert.equal(await page.locator('.site-footer__logo-video source').getAttribute('src'), '/images/dragon-footer-mark-v1.mp4')
    })

    test('Uber country tabs keep one panel visible and support keyboard navigation', async (t) => {
      const page = await visit(t, '/uber/')
      const gallery = page.locator('[data-case-tabs]')
      await gallery.scrollIntoViewIfNeeded()
      const tabs = gallery.getByRole('tab')
      const places = ['China', 'France', 'India', 'Ireland', 'Mexico', 'Morocco', 'Netherlands', 'Singapore', 'USA', 'Australia']
      assert.deepEqual(await tabs.allTextContents(), places)
      await gallery.locator('img').evaluateAll((images) => Promise.all(images.map((image) => image.decode())))
      const initialHeight = (await gallery.boundingBox()).height
      for (let i = 0; i < places.length; i++) {
        await tabs.nth(i).click()
        assert.equal(await gallery.getByRole('tab', { selected: true }).textContent(), places[i])
        assert.equal(await gallery.getByRole('tabpanel').count(), 1)
        assert.equal(await gallery.getByRole('tabpanel').getAttribute('aria-labelledby'), await tabs.nth(i).getAttribute('id'))
        assert.equal(await gallery.getByRole('tabpanel').locator('img').getAttribute('alt'), `Uber website design — ${places[i]}`)
        assert.ok(Math.abs((await gallery.boundingBox()).height - initialHeight) < 1)
      }
      await tabs.last().focus()
      await page.keyboard.press('ArrowRight')
      assert.equal(await gallery.getByRole('tab', { selected: true }).textContent(), 'China')
      await page.keyboard.press('ArrowLeft')
      assert.equal(await gallery.getByRole('tab', { selected: true }).textContent(), 'Australia')
      await page.keyboard.press('Home')
      await page.keyboard.press('ArrowRight')
      assert.equal(await gallery.getByRole('tab', { selected: true }).textContent(), 'France')
      await page.keyboard.press('End')
      await page.keyboard.press('Tab')
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('role')), 'tabpanel')
      assert.equal(await gallery.locator('img[src="/images/uber-ueno-australia-full.jpg"]').count(), 1)
      assert.equal(await page.locator('img[src$=".svg"][src*="uber-ueno"]').count(), 0)
      assert.equal(await gallery.locator('.t-tabs-pill').evaluate((pill) => getComputedStyle(pill).transitionDuration), '0s')
    })

    test('Uber tab marker aligns after resize and mobile tabs scroll without page overflow', async (t) => {
      const page = await visit(t, '/uber/', { reducedMotion: 'no-preference' })
      const gallery = page.locator('[data-case-tabs]')
      await gallery.scrollIntoViewIfNeeded()
      await gallery.getByRole('tab', { name: 'Singapore', exact: true }).click()
      await page.waitForFunction(() => {
        const group = document.querySelector('[data-case-tabs]')
        return group.querySelector('.t-tabs-pill').getAnimations().every((animation) => animation.playState === 'finished')
      })
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        await gallery.getByRole('tab', { selected: true }).focus()
        await page.keyboard.press('End')
        const geometry = await gallery.evaluate((group) => {
          const tab = group.querySelector('[aria-selected="true"]').getBoundingClientRect()
          const pill = group.querySelector('.t-tabs-pill').getBoundingClientRect()
          const scroll = group.querySelector('.case-tabs__scroll').getBoundingClientRect()
          return { difference: Math.abs(tab.x - pill.x) + Math.abs(tab.width - pill.width), visible: tab.left >= scroll.left && tab.right <= scroll.right + 1, overflow: document.documentElement.scrollWidth > innerWidth }
        })
        assert.ok(geometry.difference < 1)
        assert.ok(geometry.visible)
        assert.equal(geometry.overflow, false)
      }
    })

    test('rapid travel retains only the final destination in the tab order', async (t) => {
      const page = await visit(t, '/about/', { reducedMotion: 'no-preference' })
      await ready(page, '/praise/')
      await page.locator('.site-header a[href="/praise/"]').click()
      await page.locator('.corner-links a[href="/history/"]').click()
      await page.locator('.site-header a[href="/about/"]').click()
      await activeWorld(page, '/about/')
      await page.waitForFunction(() => !document.querySelector('.world').classList.contains('is-travelling'))
      await activeWorld(page, '/about/')
    })

    for (const failure of ['503', 'network', 'malformed']) {
      test(`${failure} sibling failure can be retried without duplicate content`, async (t) => {
        const page = await visit(t, '/about/')
        let failing = true
        await page.route('**/praise/', async (route) => {
          if (!failing) {
            const response = await route.fetch()
            return route.fulfill({ response, body: (await response.text()).replace(/<title>.*?<\/title>/, '<title>Praise retry result</title>') })
          }
          if (failure === 'network') return route.abort('failed')
          await route.fulfill({ status: failure === '503' ? 503 : 200, contentType: 'text/html', body: '<html><title>Unavailable</title><body>No page here</body></html>' })
        })
        await page.reload({ waitUntil: 'domcontentloaded' })
        await page.locator('.site-header a[href="/praise/"]').click()
        await page.getByRole('button', { name: 'Try again' }).waitFor()
        await activeWorld(page, '/praise/')
        failing = false
        await page.getByRole('button', { name: 'Try again' }).click()
        await ready(page, '/praise/')
        await activeWorld(page, '/praise/')
        assert.equal(await page.title(), 'Praise retry result')
        assert.equal(await page.locator('.world-page[data-path="/praise/"] main').count(), 1)
        assert.equal(await page.locator('.world-page[data-path="/praise/"] footer').count(), 1)
        assert.equal(await page.getByRole('button', { name: 'Try again' }).count(), 0)
      })
    }

    test('delayed content shows loading and does not steal focus after navigating away', async (t) => {
      const page = await visit(t, '/about/')
      const aboutTitle = await page.title()
      let release
      const gate = new Promise((resolve) => { release = resolve })
      t.after(() => release())
      await page.route('**/praise/', async (route) => {
        await gate
        const response = await route.fetch()
        await route.fulfill({ response, body: (await response.text()).replace(/<title>.*?<\/title>/, '<title>Delayed Praise result</title>') })
      })
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.locator('.site-header a[href="/praise/"]').click()
      assert.equal(await page.getByRole('status').filter({ hasText: 'Loading…' }).count(), 1)
      await activeWorld(page, '/praise/')
      await page.locator('.site-header a[href="/about/"]').click()
      release()
      await ready(page, '/praise/')
      await activeWorld(page, '/about/')
      assert.equal(await page.title(), aboutTitle)
      await page.locator('.site-header a[href="/praise/"]').click()
      assert.equal(await page.title(), 'Delayed Praise result')
    })

    test('retry initializes the homepage and archived gallery exactly once', async (t) => {
      const page = await visit(t, '/about/')
      let failing = true
      await page.route((url) => worldPaths.includes(url.pathname) && ['/', '/archived-work/'].includes(url.pathname), (route) => {
        if (!failing) return route.continue()
        return route.fulfill({ status: 503, body: 'Unavailable' })
      })
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.locator('.site-header__brand').click()
      await page.getByRole('button', { name: 'Try again' }).waitFor()
      failing = false
      await page.getByRole('button', { name: 'Try again' }).click()
      await ready(page, '/')
      assert.equal(await page.locator('.timeline-copy').count(), 3)
      assert.equal(await page.locator('.timeline-copy[data-copy="1"] a').count(), 7)
      await page.locator('.site-header a[href="/about/"]').click()
      await page.locator('.world-page:not([inert]) .site-footer a[href="/archived-work/"]').click()
      await page.getByRole('button', { name: 'Try again' }).click()
      await ready(page, '/archived-work/')
      assert.equal(await page.locator('.archived-grid__item').count(), 116)
      await page.locator('.world-page:not([inert]) [data-project="hmkg"] button').first().click()
      assert.equal(await page.getByRole('dialog').count(), 1)
    })

    test('lightbox traps focus, announces its counter and returns to the trigger after resizing', async (t) => {
      const page = await visit(t, '/archived-work/')
      const trigger = page.locator('.world-page:not([inert]) [data-project="hmkg"] button').first()
      const triggerIndex = await trigger.getAttribute('data-index')
      await trigger.focus()
      await page.keyboard.press('Enter')
      const dialog = page.getByRole('dialog', { name: 'Archived work image viewer' })
      await dialog.waitFor()
      assert.equal(await dialog.getByRole('status').textContent(), 'HMKG — 1/4')
      for (const key of ['Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab']) {
        await page.keyboard.press(key)
        assert.equal(await page.evaluate(() => !!document.activeElement.closest('dialog[open]')), true)
      }
      await page.keyboard.press('ArrowRight')
      assert.equal(await dialog.getByRole('status').textContent(), 'HMKG — 2/4')
      await page.keyboard.press('ArrowLeft')
      await page.setViewportSize({ width: 390, height: 844 })
      await page.waitForFunction(() => document.querySelectorAll('.archived-project[data-project="hmkg"] .archived-grid__col').length === 2)
      await page.keyboard.press('Escape')
      assert.equal(await dialog.count(), 0)
      assert.equal(await page.evaluate(() => document.activeElement.dataset.index), triggerIndex)
      await page.keyboard.press('Enter')
      await page.getByRole('button', { name: 'Close', exact: true }).click()
      assert.equal(await page.evaluate(() => document.activeElement.dataset.index), triggerIndex)
      await page.keyboard.press('Enter')
      await page.mouse.click(10, 100)
      assert.equal(await dialog.count(), 0)
      assert.equal(await page.evaluate(() => document.activeElement.dataset.index), triggerIndex)
    })

    test('archived projects have separate blocks and retain every image and lightbox position', async (t) => {
      const page = await visit(t, '/archived-work/')
      const expected = [['intro', 2], ['agens', 5], ['aprila', 1], ['brevio', 1], ['nike', 1], ['pressworks', 2], ['hmkg', 4], ['humming-people', 11], ['brathwait', 23], ['mountain-milk', 6], ['houelandek', 16], ['pelp', 10], ['godt-levert', 6], ['kaos', 14], ['daccord', 9], ['hellstrom', 2], ['poster', 1], ['yearly-report', 1], ['lettering', 1]]
      const blocks = page.locator('.archived-project')
      assert.deepEqual(await blocks.evaluateAll((blocks) => blocks.map((block) => [block.dataset.project, block.querySelectorAll('button').length])), expected)
      assert.equal(await page.locator('.archived-card').count(), 1)
      const indices = await blocks.locator('button').evaluateAll((buttons) => buttons.map((button) => Number(button.dataset.index)).sort((a, b) => a - b))
      assert.deepEqual(indices, Array.from({ length: 116 }, (_, i) => i))
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 })
        await page.waitForFunction((count) => document.querySelector('.archived-project__grid')?.children.length === count, width > 900 ? 4 : 2)
        for (let i = 0; i < expected.length; i++) {
          const block = blocks.nth(i)
          await block.scrollIntoViewIfNeeded()
          // Decode every image in this block so the separation is checked at final height.
          await block.locator('img').evaluateAll((images) => Promise.all(images.map((img) => img.decode())))
          assert.equal(await block.locator('.archived-grid__col').count(), width > 900 ? 4 : 2)
          assert.equal(await block.locator('button').evaluateAll((buttons) => new Set(buttons.map((button) => button.getAttribute('aria-label'))).size), i === 0 ? 2 : 1)
          const bounds = await block.evaluate((block) => {
            const rect = block.getBoundingClientRect()
            const previous = block.previousElementSibling?.getBoundingClientRect()
            return { left: rect.left, right: rect.right, viewport: innerWidth, gap: previous ? rect.top - previous.bottom : null }
          })
          assert.ok(bounds.left >= 0 && bounds.right <= bounds.viewport)
          if (bounds.gap !== null) assert.ok(bounds.gap >= 63)
        }
        const brathwait = page.locator('.archived-project[data-project="brathwait"] button').first()
        const triggerIndex = await brathwait.getAttribute('data-index')
        await brathwait.click()
        assert.equal(await page.getByRole('dialog').getByRole('status').textContent(), 'Brathwait — 1/23')
        await page.keyboard.press('ArrowRight')
        assert.equal(await page.getByRole('dialog').getByRole('status').textContent(), 'Brathwait — 2/23')
        await page.keyboard.press('Escape')
        assert.equal(await page.evaluate(() => document.activeElement.dataset.index), triggerIndex)
      }
    })

    test('the error screen is centered and flat, with one recovery action and a still for reduced motion', async (t) => {
      const page = await visit(t, '/about/', { viewport: { width: 390, height: 844 } })
      await page.route('**/praise/', (route) => route.fulfill({ status: 503, body: 'Unavailable' }))
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.locator('.site-header a[href="/praise/"]').click()
      await page.getByRole('button', { name: 'Try again' }).waitFor()
      const main = page.getByRole('main')
      assert.equal(await main.locator('h1').count(), 0)
      assert.equal(await main.getByRole('button').count(), 1)
      assert.equal(await main.getByRole('status').textContent(), 'We couldn’t load this page.Please try again.')
      assert.equal(await main.locator('.page-state__story').textContent(), 'HC SVNT DRACONES')
      const layout = await main.evaluate((main) => {
        const content = main.querySelector('.page-state__content').getBoundingClientRect()
        const mark = main.querySelector('.page-state__mark').getBoundingClientRect()
        const video = main.querySelector('video')
        return {
          contentX: content.x + content.width / 2,
          contentY: content.y + content.height / 2,
          centerX: innerWidth / 2,
          centerY: innerHeight / 2,
          markWidth: mark.width,
          before: getComputedStyle(main, '::before').content,
          videoSrc: video.getAttribute('src'),
          paused: video.paused,
        }
      })
      assert.ok(Math.abs(layout.contentX - layout.centerX) < 2)
      assert.ok(Math.abs(layout.contentY - layout.centerY) < 2)
      assert.equal(layout.markWidth, 150)
      assert.equal(layout.before, 'none')
      assert.equal(layout.videoSrc, null)
      assert.equal(layout.paused, true)
    })

    test('page focus has no frame and retry uses the footer hover treatment with visible keyboard focus', async (t) => {
      const page = await visit(t, '/about/', { reducedMotion: 'no-preference' })
      await page.route('**/praise/', (route) => route.fulfill({ status: 503, body: 'Unavailable' }))
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.locator('.site-header a[href="/praise/"]').click()
      await activeWorld(page, '/praise/')
      const retry = page.getByRole('button', { name: 'Try again' })
      await retry.waitFor()
      await page.waitForFunction(() => !document.querySelector('.world').classList.contains('is-travelling'))
      assert.equal(await page.getByRole('main').evaluate((main) => getComputedStyle(main).outlineStyle), 'none')
      const properties = (el) => {
        const css = getComputedStyle(el)
        return { color: css.color, border: css.borderTopColor, transition: css.transition }
      }
      const before = await retry.evaluate(properties)
      const footer = page.locator('.world-page[data-path="/about/"] .site-footer a[href="/archived-work/"]')
      assert.equal(before.transition, (await footer.evaluate(properties)).transition)
      await retry.hover()
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.page-state__action')).color === 'rgb(24, 24, 27)')
      const hovered = await retry.evaluate(properties)
      assert.notEqual(hovered.color, before.color)
      assert.notEqual(hovered.border, before.border)
      await page.mouse.move(10, 10)
      // Safari uses Option+Tab to include buttons when full keyboard access is off.
      await page.keyboard.press(engine === 'webkit' ? 'Alt+Tab' : 'Tab')
      assert.equal(await retry.evaluate((button) => button === document.activeElement && button.matches(':focus-visible')), true)
      assert.equal(await retry.evaluate((button) => getComputedStyle(button).outlineWidth), '2px')
    })

    test('missing routes return the custom 404 with a working home link, even without JavaScript', async (t) => {
      const page = await visit(t, '/about/', { javaScriptEnabled: false })
      const response = await page.goto(base + '/this-page-does-not-exist/', { waitUntil: 'domcontentloaded' })
      assert.equal(response.status(), 404)
      assert.match(await page.title(), /Page not found/)
      assert.equal(await page.getByRole('link').count(), 1)
      await page.getByRole('heading', { name: /Sorry - this page couldn't be found/ }).waitFor()
      await page.getByRole('link', { name: 'Back home', exact: true }).click()
      await page.waitForURL(base + '/')
    })

    test('the dragon animates only on the active error state and keeps a still if video is unavailable', async (t) => {
      const page = await visit(t, '/about/', { reducedMotion: 'no-preference' })
      await page.route('**/praise/', (route) => route.fulfill({ status: 503, body: 'Unavailable' }))
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => document.querySelector('.world-page[data-path="/praise/"]')?.dataset.loadState === 'error')
      assert.equal(await page.locator('.world-page[data-path="/praise/"] video').getAttribute('src'), null)
      await page.locator('.site-header a[href="/praise/"]').click()
      await page.waitForFunction(() => document.querySelector('.world-page:not([inert]) .page-state__mark video')?.currentTime > 0)
      await page.locator('.site-header a[href="/about/"]').click()
      assert.equal(await page.locator('.world-page[data-path="/praise/"] video').evaluate((video) => video.paused), true)

      await page.route('**/dragon-error-mark-v1.mp4', (route) => route.abort())
      await page.goto(base + '/404.html', { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => document.querySelector('.page-state__mark img').complete)
      assert.equal(await page.locator('.page-state__mark').evaluate((mark) => mark.classList.contains('is-playing')), false)
      assert.ok(await page.locator('.page-state__mark img').evaluate((img) => img.naturalWidth > 0))
      assert.equal(await page.getByRole('link', { name: 'Back home' }).count(), 1)
    })

    test('archived arrows preserve a direct-entry fallback and browser Back stays native', async (t) => {
      const page = await visit(t, '/hmkg/')
      await page.getByRole('link', { name: 'Next archived project' }).click()
      await page.waitForURL('**/humming-people/')
      await page.keyboard.press('ArrowRight')
      await page.waitForURL('**/brathwait/')
      await page.goBack()
      await page.waitForURL('**/humming-people/')
      await page.getByRole('button', { name: 'Close project and return to overview' }).click()
      await page.waitForURL('**/archived-work/')
    })

    test('an explicit world entry is preserved through an archived case chain and reload', async (t) => {
      const page = await visit(t, '/history/')
      // The gallery intentionally opens a lightbox; supply a test link to exercise
      // the supported same-origin case entry without changing production content.
      await page.evaluate(() => {
        const link = document.createElement('a')
        link.href = '/hmkg/'
        link.textContent = 'Open test case'
        document.querySelector('.world-page:not([inert]) main').prepend(link)
      })
      await page.getByRole('link', { name: 'Open test case' }).click()
      await page.waitForURL('**/hmkg/')
      await page.getByRole('link', { name: 'Next archived project' }).click()
      await page.waitForURL('**/humming-people/')
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.keyboard.press('Escape')
      await page.waitForURL('**/history/')
    })

    test('selected case close restores the timeline and transcript Escape stays in the case', async (t) => {
      const page = await visit(t, '/')
      const tile = page.getByRole('link', { name: 'MICROMILSPEC', exact: true })
      const originalCover = await tile.locator('img').getAttribute('src')
      await page.keyboard.press('b')
      const selectedCover = await tile.locator('img').getAttribute('src')
      assert.notEqual(selectedCover, originalCover)
      await tile.focus()
      await page.keyboard.press('Enter')
      await page.waitForURL('**/micromilspec/')
      assert.equal(await page.locator('.case-cover-hero img').getAttribute('src'), selectedCover)
      await page.locator('[data-transcript-open]').click()
      await page.keyboard.press('Escape')
      await page.locator('dialog[open]').waitFor({ state: 'hidden' })
      assert.equal(new URL(page.url()).pathname, '/micromilspec/')
      await page.getByRole('button', { name: 'Close project and return to overview' }).click()
      await page.waitForURL(base + '/')
      await ready(page, '/')
      await page.waitForFunction(() => [...document.querySelectorAll('[data-tile-id="micromilspec"]')].some((tile) => {
        const rect = tile.getBoundingClientRect()
        return rect.right > 0 && rect.left < innerWidth
      }))
    })

    for (const mode of ['methods', 'getter']) {
      test(`denied storage ${mode} do not break any public entry or primary controls`, async (t) => {
        const denyMethods = () => {
          Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new DOMException('Denied', 'SecurityError') }
        }
        const denyGetter = () => {
          Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('Denied', 'SecurityError') } })
        }
        const page = await visit(t, '/', {}, mode === 'methods' ? denyMethods : denyGetter)
        const errors = []
        page.on('pageerror', (error) => {
          // The audit already records a Chromium cross-document transition skip.
          // It is independent of storage; every other uncaught error fails this test.
          if (error.message !== 'Transition was skipped') errors.push(error.message)
        })
        for (const path of [...worldPaths, ...casePaths, '/logo/']) {
          await page.goto(base + path, { waitUntil: 'domcontentloaded' })
          if (worldPaths.includes(path)) await ready(page, path)
          else if (casePaths.includes(path)) await page.getByRole('button', { name: 'Close project and return to overview' }).waitFor()
          else await page.locator('canvas').waitFor()
        }
        await page.goto(base + '/micromilspec/', { waitUntil: 'domcontentloaded' })
        await page.locator('[data-transcript-open]').click()
        await page.locator('dialog[open]').waitFor()
        await page.keyboard.press('Escape')
        await page.locator('dialog[open]').waitFor({ state: 'hidden' })
        await page.locator('.project-audio__player').click()
        await page.waitForFunction(() => document.querySelector('.project-audio audio')?.currentTime > 0)
        await page.getByRole('button', { name: 'Close project and return to overview' }).click()
        await page.waitForURL(base + '/')
        await page.locator('.site-header a[href="/about/"]').click()
        await activeWorld(page, '/about/')
        assert.deepEqual(errors, [])
      })
    }
  })
}
