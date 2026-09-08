import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { preview } from 'vite'
import { chromium, webkit } from 'playwright'
import { loadLazyMedia } from '../scripts/screenshot-media.mjs'

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

    test('reduced motion makes timeline keys immediate and responds to preference changes', async (t) => {
      const page = await visit(t, '/')
      await ready(page, '/')
      const step = () => page.locator('.timeline-scroller').evaluate((el) => {
        const before = el.scrollLeft
        el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
        return el.scrollLeft - before
      })
      assert.ok(Math.abs(await step() - 320) < 2)
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      // WebKit delivers the media-query change on the next rendering frame.
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      assert.ok(Math.abs(await step()) < 10, 'normal preference retains smooth travel')
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      assert.ok(Math.abs(await step() - 320) < 2)
    })

    test('case video controls allow deliberate reduced-motion playback and retain pause on scroll', async (t) => {
      const page = await visit(t, '/finn/')
      const video = page.locator('video[data-media-controls]').first()
      await video.scrollIntoViewIfNeeded()
      assert.equal(await video.evaluate((el) => el.paused), true)
      assert.equal(await video.getAttribute('src'), null)
      const control = video.locator('..').getByRole('button', { name: 'Play video', exact: true })
      await control.focus()
      await page.keyboard.press('Enter')
      await page.waitForFunction(() => document.querySelector('video[data-media-controls]').currentTime > 0)
      await page.getByRole('button', { name: 'Pause video', exact: true }).click()
      await page.mouse.wheel(0, 30)
      await page.waitForTimeout(150)
      assert.equal(await video.evaluate((el) => el.paused), true)
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      assert.equal(await video.evaluate((el) => el.paused), true, 'manual pause survives preference change')
      await control.click()
      await page.waitForFunction(() => !document.querySelector('video[data-media-controls]').paused)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.waitForFunction(() => document.querySelector('video[data-media-controls]').paused)
      await page.goto(base + '/about/', { waitUntil: 'domcontentloaded' })
      await ready(page, '/about/')
      await page.locator('.world-page:not([inert])').evaluate((el) => el.scrollTo(0, el.scrollHeight))
      assert.equal(await page.locator('.world-page:not([inert]) .site-footer video').evaluate((el) => el.paused), true)
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await page.waitForFunction(() => document.querySelector('.world-page:not([inert]) .site-footer video').currentTime > 0)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.waitForFunction(() => document.querySelector('.world-page:not([inert]) .site-footer video').paused)
    })

    test('case layout shortcut cycles three variants and keeps the image before the new text layout', async (t) => {
      const page = await visit(t, '/hjemla/')
      const lead = page.locator('.case-lead')
      assert.equal(await lead.getAttribute('data-layout'), 'original')
      await page.keyboard.press('c')
      assert.equal(await lead.getAttribute('data-layout'), 'columns')
      await page.keyboard.press('c')
      assert.equal(await lead.getAttribute('data-layout'), 'below')
      for (const path of ['/hjemla/', '/uber/', '/boligmappa/']) {
        await page.goto(base + path)
        const group = page.locator('.case-lead, .case-legacy-lead')
        assert.equal(await group.getAttribute('data-layout'), 'below', 'layout survives navigation')
        for (const width of [1440, 390]) {
          await page.setViewportSize({ width, height: 900 })
          const geometry = await group.evaluate((el) => {
            const rect = (selector) => el.querySelector(selector)?.getBoundingClientRect().toJSON()
            return {
              hero: rect('.case-cover-hero'), title: rect('.case-lead__title, .case-legacy-title'),
              intro: rect('.case-lead__intro, .case-legacy-intro'), credits: rect('.case-credits'),
              overflow: document.documentElement.scrollWidth > innerWidth,
              first: el.firstElementChild.classList.contains('case-cover-hero'),
            }
          })
          assert.equal(geometry.overflow, false, path)
          assert.equal(geometry.first, true)
          assert.ok(geometry.title.top > geometry.hero.bottom)
          if (geometry.credits) {
            if (width > 1023) assert.ok(geometry.credits.left >= geometry.intro.right)
            else assert.ok(geometry.credits.top >= geometry.intro.bottom)
          }
        }
      }
      await page.keyboard.press('c')
      assert.equal(await page.locator('.case-legacy-lead').getAttribute('data-layout'), 'original')
      await page.goto(base + '/hjemla/')
      assert.equal(await lead.getAttribute('data-layout'), 'original')
      assert.equal(await lead.evaluate((el) => el.lastElementChild.classList.contains('case-cover-hero')), true)
    })

    test('archive lightbox respects reduced motion and exposes keyboard playback', async (t) => {
      const page = await visit(t, '/archived-work/')
      await ready(page, '/archived-work/')
      const tile = page.getByRole('button', { name: 'Show Capa vignette large', exact: true })
      await tile.click()
      const dialog = page.getByRole('dialog')
      assert.equal(await dialog.locator('video').evaluate((el) => el.paused), true)
      await dialog.getByRole('button', { name: 'Play video', exact: true }).focus()
      await page.keyboard.press('Enter')
      await page.waitForFunction(() => document.querySelector('dialog video').currentTime > 0)
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      // Media-query change events are frame-delivered; model two real preference changes.
      await page.waitForTimeout(100)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.waitForFunction(() => document.querySelector('dialog video').paused)
      await page.keyboard.press('Escape')
      assert.equal(await dialog.count(), 0)
      assert.equal(await tile.evaluate((el) => el === document.activeElement), true)
    })

    test('shared secondary text keeps readable contrast at rest and during hover', async (t) => {
      const page = await visit(t, '/history/')
      const ratio = async (selector) => page.locator(selector).evaluateAll((nodes) => nodes.map((el) => {
        const rgb = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number)
        const luminance = (color) => color.map((v) => v / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
        let background = [250, 250, 250]
        let opacity = 1
        for (let node = el; node; node = node.parentElement) {
          const css = getComputedStyle(node)
          opacity *= Number(css.opacity)
          if (css.backgroundColor !== 'rgba(0, 0, 0, 0)' && css.backgroundColor !== 'transparent') {
            background = rgb(css.backgroundColor)
            break
          }
        }
        const foreground = rgb(getComputedStyle(el).color).map((v, i) => v * opacity + background[i] * (1 - opacity))
        const a = luminance(foreground), b = luminance(background)
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
      }))
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 })
        for (const [path, selector, hover] of [
          ['/history/', '.archive-year, .archive-type', '.archive-list li'],
          ['/finn/', '.case-credits__label, .case-credits__role, .case-credits__names', '.case-credits__row'],
          ['/about/', '.employments-table td', '.employments-table tr'],
          ['/praise/', '.text-secondary', null],
          ['/people/', '.text-secondary, .archive-name.is-met', null],
          ['/archived-work/', '.archived-card__meta', null],
        ]) {
          await page.goto(base + path, { waitUntil: 'domcontentloaded' })
          const scoped = path === '/finn/' ? selector : selector.split(', ').map((s) => '.world-page:not([inert]) ' + s).join(', ')
          await page.locator(scoped).first().waitFor()
          assert.ok((await ratio(scoped)).every((value) => value >= 4.5), `${path} resting contrast at ${width}`)
          if (hover) {
            const target = path === '/finn/' ? hover : '.world-page:not([inert]) ' + hover
            await page.locator(target).first().hover()
            await page.waitForTimeout(180)
            assert.ok((await ratio(scoped)).every((value) => value >= 4.5), `${path} hover contrast at ${width}`)
          }
        }
        await page.locator('.world-page:not([inert])').evaluate((el) => el.scrollTo(0, el.scrollHeight))
        const footerLinks = '.world-page:not([inert]) .site-footer__contact a'
        assert.ok((await ratio(footerLinks)).every((value) => value >= 4.5))
        await page.locator(footerLinks).first().hover()
        await page.locator(footerLinks).first().focus()
        await page.waitForTimeout(180)
        assert.ok((await ratio(footerLinks)).every((value) => value >= 4.5))
      }
    })

    test('screenshot preparation loads the active world gallery and returns to the top', async (t) => {
      const page = await visit(t, '/archived-work/', { viewport: { width: 390, height: 844 } })
      await ready(page, '/archived-work/')
      const images = page.locator('.world-page:not([inert]) .archived-grid img')
      assert.ok(await images.evaluateAll((nodes) => nodes.some((el) => !el.hasAttribute('src'))), 'fixture starts with deferred images')
      const result = await loadLazyMedia(page)
      assert.equal(result.scroller, 'world')
      assert.ok(result.loadedImages >= await images.count())
      assert.equal(await images.evaluateAll((nodes) => nodes.every((el) => el.complete && el.naturalWidth > 0)), true)
      assert.equal(await page.locator('.world-page:not([inert])').evaluate((el) => el.scrollTop), 0)
      assert.equal(await page.evaluate(() => window.scrollY), 0)
      assert.equal(await page.locator('.world-page[inert] [data-media-src][src]').count(), 0, 'inactive pages are not traversed')
    })

    test('screenshot preparation reports failed images instead of silently capturing gaps', async (t) => {
      const page = await visit(t, '/about/')
      await page.route('**/images/**', (route) => route.abort())
      await page.goto(base + '/archived-work/', { waitUntil: 'domcontentloaded' })
      await ready(page, '/archived-work/')
      await assert.rejects(loadLazyMedia(page), /Screenshot image failed:/)
      assert.equal(await page.locator('.world-page:not([inert])').evaluate((el) => el.scrollTop), 0)
    })

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

    test('returning to a world page resets its scroll before the camera transition', async (t) => {
      for (const reducedMotion of ['reduce', 'no-preference']) {
        const page = await visit(t, '/about/', { reducedMotion })
        await ready(page, '/history/')
        const scrollToBottom = async () => {
          const top = await page.locator('.world-page:not([inert])').evaluate((el) => {
            el.scrollTo({ top: el.scrollHeight, behavior: 'instant' })
            return el.scrollTop
          })
          assert.ok(top > 100, 'the page really was scrolled')
        }
        await scrollToBottom()
        await page.locator('.corner-links a[href="/history/"]').click()
        await activeWorld(page, '/history/')
        await scrollToBottom()
        const positions = await page.evaluate(() => {
          const from = document.querySelector('.world-page[data-path="/history/"]')
          const to = document.querySelector('.world-page[data-path="/about/"]')
          const fromBefore = from.scrollTop
          const toBefore = to.scrollTop
          document.querySelector('.site-header a[href="/about/"]').click()
          return { fromBefore, fromAfter: from.scrollTop, toBefore, toAfter: to.scrollTop }
        })
        assert.ok(positions.toBefore > 100)
        assert.equal(positions.toAfter, 0, 'reset happens synchronously before animation')
        assert.equal(positions.fromAfter, positions.fromBefore, 'outgoing page does not jump')
        await activeWorld(page, '/about/')
        await scrollToBottom()
        await page.goBack()
        await activeWorld(page, '/history/')
        assert.equal(await page.locator('.world-page:not([inert])').evaluate((el) => el.scrollTop), 0)
        await page.goForward()
        await activeWorld(page, '/about/')
        await page.waitForFunction(() => !document.querySelector('.world').classList.contains('is-travelling'))
        assert.equal(await page.locator('.world-page:not([inert])').evaluate((el) => el.scrollTop), 0)
        await ready(page, '/')
        const workLink = page.locator('.site-header__work a')
        await workLink.click()
        await activeWorld(page, '/')
        const timeline = page.locator('.timeline-scroller')
        await page.evaluate(() => document.fonts.ready)
        await timeline.evaluate((el) => {
          el.scrollTo({ left: el.scrollLeft + 320, behavior: 'instant' })
        })
        // Let the looping timeline normalize its scroll offset before recording it.
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
        const position = await timeline.evaluate((el) => el.scrollLeft)
        await page.locator('.site-header a[href="/about/"]').click()
        await activeWorld(page, '/about/')
        await workLink.click()
        await activeWorld(page, '/')
        assert.ok(Math.abs(await timeline.evaluate((el) => el.scrollLeft) - position) < 2, 'Work preserves its timeline position')
      }
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

    test('interrupted camera trips preserve world and card transforms through pan and landing', async (t) => {
      const page = await visit(t, '/about/', { reducedMotion: 'no-preference' })
      await ready(page, '/praise/')
      await page.locator('.site-header a[href="/praise/"]').click()
      for (const [path, elapsed] of [['/history/', 300], ['/people/', 850], ['/about/', 80]]) {
        await page.waitForTimeout(elapsed)
        const jump = await page.evaluate(async (path) => {
          const nodes = [document.querySelector('.world'), ...document.querySelectorAll('.world-page')]
          const animations = nodes.flatMap((node) => node.getAnimations())
          animations.forEach((animation) => animation.pause())
          await Promise.all(animations.map((animation) => animation.ready))
          const transforms = () => nodes.map((node) => [...new DOMMatrix(getComputedStyle(node).transform).toFloat64Array()])
          const before = transforms()
          document.querySelector(`.site-header a[href="${path}"], .corner-links a[href="${path}"]`).click()
          return Math.max(...transforms().flatMap((values, i) => values.map((v, j) => Math.abs(v - before[i][j]))))
        }, path)
        assert.ok(jump < 1, `synchronous transform jump: ${jump}`)
      }
      await page.waitForFunction(() => !document.querySelector('.world').classList.contains('is-travelling'))
      assert.equal(await page.locator('.world-page:not([inert])').getAttribute('data-path'), '/about/')
      assert.equal(await page.locator('.world-page:not([inert])').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a), 1)
    })

    test('world links preserve native modified, targeted and download clicks', async (t) => {
      const page = await visit(t, '/about/')
      await ready(page, '/archived-work/')
      const results = await page.evaluate(() => {
        const links = [document.querySelector('.site-header a[href="/praise/"]'), document.querySelector('.site-header a[href="/about/"]'), document.querySelector('.corner-links a'), document.querySelector('.world-page[data-path="/about/"] .site-footer a[href="/archived-work/"]')]
        return links.flatMap((link) => ['metaKey', 'ctrlKey', 'shiftKey', 'altKey', 'middle', 'target', 'download', 'prevented'].map((kind) => {
          if (kind === 'target') link.target = '_blank'
          if (kind === 'download') link.setAttribute('download', '')
          const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: kind === 'middle' ? 1 : 0, [kind]: true })
          if (kind === 'prevented') event.preventDefault()
          let prevented
          // Capture the app's decision, then prevent native navigation in this probe.
          const stop = (e) => { prevented = e.defaultPrevented; e.preventDefault() }
          window.addEventListener('click', stop, { once: true })
          link.dispatchEvent(event)
          link.removeAttribute('target'); link.removeAttribute('download')
          return { kind, prevented }
        }))
      })
      assert.ok(results.every(({ kind, prevented }) => prevented === (kind === 'prevented')))
      assert.equal(new URL(page.url()).pathname, '/about/')
      await page.locator('.site-header a[href="/praise/"]').click()
      await activeWorld(page, '/praise/')
    })

    test('mobile intro has clear space before the looping timeline at every narrow width', async (t) => {
      for (const width of [320, 390, 430]) {
        const page = await visit(t, '/', { viewport: { width, height: 844 } })
        await page.evaluate(() => document.fonts.ready)
        const scroller = page.locator('[data-timeline]')
        await page.waitForTimeout(150)
        const geometry = await scroller.evaluate((el) => {
          const intro = el.querySelector('.timeline-intro').getBoundingClientRect()
          const preceding = el.querySelector('.timeline-copy[data-copy="0"] .timeline-tile:last-child').getBoundingClientRect()
          const first = el.querySelector('.timeline-copy[data-copy="1"] .timeline-tile').getBoundingClientRect()
          return { intro: intro.left, preceding: preceding.right, first: first.left, end: intro.right }
        })
        assert.ok(geometry.preceding <= geometry.intro - 34, JSON.stringify({ width, ...geometry }))
        assert.ok(geometry.first >= geometry.end + 55)
        const start = await scroller.evaluate((el) => el.scrollLeft)
        await scroller.hover()
        await page.mouse.wheel(0, 400)
        await page.waitForFunction((start) => document.querySelector('[data-timeline]').scrollLeft !== start, start)
      }
    })

    test('archive reserves image geometry before downloads finish', async (t) => {
      let release
      const gate = new Promise((resolve) => { release = resolve })
      t.after(() => release())
      const page = await visit(t, '/about/')
      await page.evaluate(() => document.fonts.ready)
      await page.route('**/images/**/*.{jpg,png,webp}', async (route) => { await gate; await route.continue().catch(() => {}) })
      await page.goto(base + '/archived-work/', { waitUntil: 'domcontentloaded' })
      await ready(page, '/archived-work/')
      const images = page.locator('.archived-grid__item img')
      assert.ok(await images.count() > 100)
      assert.equal(await images.evaluateAll((images) => images.every((img) => img.width > 0 && img.height > 0 && img.hasAttribute('width') && img.hasAttribute('height'))), true)
      const first = images.first()
      const before = await first.boundingBox()
      release()
      await page.waitForFunction(() => document.querySelector('.archived-grid__item img').naturalWidth > 0)
      const after = await first.boundingBox()
      assert.ok(Math.abs(before.height - after.height) < 1)
      assert.ok(Math.abs(before.y - after.y) < 1)
    })

    test('personal notes reports audio failure, retains the transcript and retries successfully', async (t) => {
      const page = await visit(t, '/micromilspec/')
      await page.route('**/*.mp3', (route) => route.abort())
      const play = page.locator('[data-project-audio-button]')
      await play.click()
      await page.waitForFunction(() => document.querySelector('[data-audio-status]').textContent.includes('couldn’t load'))
      assert.match(await play.getAttribute('aria-label'), /Retry/)
      const read = page.locator('[data-transcript-open]')
      assert.ok((await read.boundingBox()).height >= 44)
      await read.click()
      await page.keyboard.press('Escape')
      assert.equal(await read.evaluate((el) => el === document.activeElement), true)
      await page.unroute('**/*.mp3')
      await play.click()
      await page.waitForFunction(() => document.querySelector('[data-project-audio]').currentTime > 0)
      assert.equal(await page.locator('[data-audio-status]').textContent(), '')
      assert.equal(await play.getAttribute('aria-pressed'), 'true')
    })

    test('transcript animation survives close during entry and immediate reopening', async (t) => {
      const page = await visit(t, '/off-market/', { reducedMotion: 'no-preference', viewport: { width: 390, height: 844 } })
      await page.locator('[data-transcript-open]').scrollIntoViewIfNeeded()
      await page.evaluate(async () => {
        const open = document.querySelector('[data-transcript-open]')
        const close = document.querySelector('[data-transcript-close]')
        const click = (el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
        click(open)
        await new Promise((r) => setTimeout(r, 50))
        click(close)
        await new Promise((r) => setTimeout(r, 40))
        click(open)
      })
      await page.waitForTimeout(300)
      assert.equal(await page.locator('dialog[open]').count(), 1)
      assert.equal(await page.locator('dialog').evaluate((el) => getComputedStyle(el).opacity), '1')
      await page.keyboard.press('Escape')
      assert.equal(await page.locator('dialog[open]').count(), 0)
      assert.equal(await page.locator('[data-transcript-open]').evaluate((el) => el === document.activeElement), true)
    })

    test('inactive archive media waits for navigation and videos pause after leaving view', async (t) => {
      const requests = []
      const page = await visit(t, '/about/', { reducedMotion: 'no-preference' })
      page.on('request', (request) => requests.push(new URL(request.url()).pathname))
      await page.reload({ waitUntil: 'domcontentloaded' })
      await ready(page, '/archived-work/')
      await page.waitForTimeout(3500)
      assert.equal(await page.locator('.world-page[data-path="/archived-work/"] .archived-grid__item img[src]').count(), 0)
      assert.ok(!requests.some((path) => /\.(mp4|webm)$/.test(path)))
      assert.ok(!requests.some((path) => casePaths.includes(path)))
      await page.locator('.world-page[data-path="/about/"] .site-footer a[href="/archived-work/"]').click()
      const video = page.locator('.archived-grid__item video').first()
      await page.waitForFunction(() => document.querySelector('.archived-grid__item video').currentTime > 0)
      assert.ok(await page.locator('.archived-grid__item img[src]').count() < await page.locator('.archived-grid__item img').count())
      await page.locator('.site-header a[href="/about/"]').click()
      assert.equal(await video.evaluate((el) => el.paused), true)
    })

    test('case preparation is bounded, deduplicated and disabled for data saving', async (t) => {
      for (const saveData of [false, true]) {
        const page = await visit(t, '/', {}, () => {})
        await page.evaluate((saveData) => Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData } }), saveData)
        const documents = []
        page.on('request', (request) => { if (casePaths.includes(new URL(request.url()).pathname)) documents.push(new URL(request.url()).pathname) })
        await page.locator('.timeline-copy[data-copy="1"]').evaluate((el) => {
          for (let repeat = 0; repeat < 2; repeat++) el.querySelectorAll('a').forEach((link) => link.dispatchEvent(new PointerEvent('pointerover', { bubbles: true })))
        })
        await page.waitForTimeout(300)
        assert.equal(documents.length, saveData ? 0 : 3)
        assert.equal(documents.length, new Set(documents).size)
      }
    })

    if (engine === 'chromium') test('cold homepage to case transition captures a decoded hero without prerendering', async (t) => {
      const page = await visit(t, '/', { reducedMotion: 'no-preference' }, () => {
        window.addEventListener('pagereveal', (event) => {
          if (!event.viewTransition) return
          event.viewTransition.ready.then(() => {
            if (location.pathname === '/micromilspec/') sessionStorage.setItem('test:hero-ready', String(!!document.querySelector('.case-cover-hero img')?.naturalWidth))
          }, () => {})
        })
      })
      await page.waitForFunction(() => !document.body.classList.contains('world-map-intro') && !document.body.classList.contains('is-entering-home'))
      const tile = page.locator('.timeline-copy[data-copy="1"] a').first()
      await tile.hover()
      await page.waitForTimeout(300)
      await tile.click()
      await page.waitForURL('**/micromilspec/')
      await page.waitForFunction(() => sessionStorage.getItem('test:hero-ready') === 'true')
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
      assert.equal(await grid.locator('[data-project="kaos"] .archived-grid__name').textContent(), 'Shopify theme')
      assert.equal(await grid.locator('.archived-card__meta').textContent(), 'Miscellaneous work (2012–Present)')
      for (const [id, year] of [['agens', '2025'], ['kaos', '2016'], ['hellstrom', '2015'], ['aprila', '2018'], ['brevio', '2017'], ['abelee', '2017'], ['humming-people', '2018'], ['hmkg', '2014'], ['pelp', '2014'], ['godt-levert', '2015'], ['klp', '2017'], ['just', '2017'], ['kindly', '2016'], ['changemaker', '2016'], ['tone', '2015'], ['lego', '2012'], ['nike', '2016'], ['pressworks', '2017'], ['mountain-milk', '2011']]) {
        assert.ok((await grid.locator(`[data-project="${id}"] .archived-grid__meta`).textContent()).includes(year))
      }
      for (const file of ['agens-1.png', 'misc-agens-1.jpg', 'misc-agens-2.jpg', 'misc-agens-3.jpg', 'misc-agens-4.jpg', 'misc-aprila.jpg', 'misc-brevio.jpg', 'misc-logos.jpg', 'misc-nike.jpg', 'misc-pressworks.jpg', 'pressworks-mobile-v1.jpg']) {
        assert.equal(await grid.locator(`img[data-media-src="/images/${file}"]`).count(), 1)
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
      assert.equal(await page.locator('.site-footer__logo-video').getAttribute('data-media-src'), '/images/drage-black-bg-preview-001.mp4')
    })

    test('Uber long-page gallery opens readable images and restores the case on close', async (t) => {
      const page = await visit(t, '/uber/')
      const thumbs = page.locator('[data-case-image]')
      assert.equal(await thumbs.count(), 5)
      assert.equal(await page.locator('img[src="/images/uber-2-full.jpg"]').count(), 0)
      assert.equal(await page.locator('img[src="/images/uber-ueno-home-top-full.jpg"]').count(), 0)
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 })
        for (let i = 0; i < 5; i++) {
          const trigger = thumbs.nth(i)
          await trigger.click()
          const dialog = page.locator('.case-image-viewer[open]')
          const image = dialog.locator('img')
          await image.evaluate((el) => el.decode())
          assert.equal(await image.getAttribute('src'), await trigger.getAttribute('data-case-image'))
          assert.ok((await image.boundingBox()).width > (await trigger.boundingBox()).width * 1.8)
          assert.equal(await dialog.locator('.case-image-viewer__scroll').evaluate((el) => {
            el.scrollTop = 100
            return el.scrollHeight <= el.clientHeight || el.scrollTop > 0
          }), true)
          await page.keyboard.press('ArrowRight')
          assert.equal(await image.getAttribute('src'), await thumbs.nth((i + 1) % 5).getAttribute('data-case-image'))
          await page.keyboard.press('Escape')
          assert.equal(await page.locator('dialog[open]').count(), 0)
          assert.equal(await trigger.evaluate((el) => el === document.activeElement), true)
          assert.equal(new URL(page.url()).pathname, '/uber/')
          assert.equal(await page.evaluate(() => document.documentElement.style.overflow), '')
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      }
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
      assert.equal(await page.locator('.archived-grid__item').count(), 158)
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

    test('new archive films have posters and open as playable videos', async (t) => {
      const page = await visit(t, '/archived-work/')
      await ready(page, '/archived-work/')
      for (const [id, count] of [['klp', 2], ['kindly', 3], ['abelee', 2], ['brevio', 3], ['just', 2]]) {
        const block = page.locator(`[data-project="${id}"]`)
        const previews = block.locator('video')
        assert.equal(await previews.count(), count)
        for (const preview of await previews.all()) {
          const poster = await preview.getAttribute('poster') || await preview.getAttribute('data-media-poster')
          const response = await page.request.get(base + poster)
          assert.equal(response.status(), 200, poster)
          assert.match(response.headers()['content-type'], /image/)
        }
        const trigger = block.locator('button').filter({ has: page.locator('video') }).first()
        await trigger.click()
        const dialog = page.getByRole('dialog')
        const video = dialog.locator('video')
        assert.equal(await video.count(), 1)
        await dialog.getByRole('button', { name: 'Play video', exact: true }).click()
        await page.waitForFunction(() => {
          const video = document.querySelector('dialog[open] video')
          return video && !video.paused && video.readyState >= 2
        })
        await page.keyboard.press('Escape')
        assert.equal(await page.getByRole('dialog').count(), 0)
        assert.equal(await trigger.evaluate((el) => el === document.activeElement), true)
      }
    })

    test('archived projects have separate blocks and retain every image and lightbox position', async (t) => {
      const page = await visit(t, '/archived-work/')
      const expected = [['intro', 2], ['agens', 5], ['aprila', 1], ['humming-people', 11], ['brevio', 17], ['klp', 4], ['just', 2], ['abelee', 2], ['pressworks', 2], ['kindly', 3], ['changemaker', 8], ['nike', 1], ['houelandek', 16], ['kaos', 14], ['brathwait', 23], ['tone', 4], ['godt-levert', 6], ['hellstrom', 2], ['hmkg', 4], ['pelp', 10], ['lego', 3], ['mountain-milk', 6], ['daccord', 9], ['poster', 1], ['yearly-report', 1], ['lettering', 1]]
      const blocks = page.locator('.archived-project')
      assert.deepEqual(await blocks.evaluateAll((blocks) => blocks.map((block) => [block.dataset.project, block.querySelectorAll('button').length])), expected)
      assert.equal(await page.locator('.archived-card').count(), 1)
      const indices = await blocks.locator('button').evaluateAll((buttons) => buttons.map((button) => Number(button.dataset.index)).sort((a, b) => a - b))
      assert.deepEqual(indices, Array.from({ length: 158 }, (_, i) => i))
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 })
        await page.waitForFunction((count) => document.querySelector('.archived-project__grid')?.children.length === count, width > 900 ? 4 : 2)
        for (let i = 0; i < expected.length; i++) {
          const block = blocks.nth(i)
          await block.scrollIntoViewIfNeeded()
          // Geometry is reserved even for images still outside the viewport.
          await block.locator('img[src]').evaluateAll((images) => Promise.all(images.map((img) => img.decode())))
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
      await page.keyboard.press(engine === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab')
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
      await page.keyboard.press('ArrowRight')
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
      await page.keyboard.press('ArrowRight')
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
