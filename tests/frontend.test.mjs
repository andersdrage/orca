import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { preview } from 'vite'
import { chromium, webkit } from 'playwright'
import sharp from 'sharp'
import { FEATURED_ORDER } from '../src/case-navigation.js'
import { loadLazyMedia } from '../scripts/screenshot-media.mjs'

const worldPaths = ['/', '/about/', '/praise/', '/timeline/', '/people/', '/archived-work/']
const casePaths = FEATURED_ORDER.map(id => `/${id}/`)
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

    })

    test('case layout shortcut cycles three variants and keeps the image before the new text layout', async (t) => {
      const page = await visit(t, '/hjemla/')
      const lead = page.locator('.case-lead')
      assert.equal(await lead.getAttribute('data-layout'), 'presentation')
      await page.keyboard.press('p')
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

    test('P presentation preserves the chosen C layout, contributors and responsive content', async (t) => {
      const page = await visit(t, '/hjemla/')
      await page.keyboard.press('p')
      await page.keyboard.press('c')
      await page.keyboard.press('c')
      const names = await page.locator('.case-credits__names').allTextContents()
      await page.keyboard.press('p')
      const group = page.locator('.case-lead, .case-legacy-lead')
      assert.equal(await group.getAttribute('data-layout'), 'presentation')
      assert.equal(await page.locator('.case-cover-hero').isVisible(), false)
      assert.deepEqual(await page.locator('.case-credits__names').allTextContents(), names)
      assert.equal(await page.locator('.case-credits__row').first().evaluate(el => getComputedStyle(el).animationName), 'none')
      for (const path of ['/hjemla/', '/uber/', '/boligmappa/']) {
        await page.goto(base + path)
        assert.equal(await group.getAttribute('data-layout'), 'presentation')
        for (const width of [1440, 390]) {
          await page.setViewportSize({ width, height: 900 })
          const geometry = await group.evaluate(el => {
            const intro = el.querySelector('.case-lead__intro, .case-legacy-intro').getBoundingClientRect()
            const credits = el.querySelector('.case-title-block')?.getBoundingClientRect()
            return { center: (intro.left + intro.right) / 2, below: !credits || credits.top >= intro.bottom,
              overflow: document.documentElement.scrollWidth > innerWidth }
          })
          assert.ok(Math.abs(geometry.center - width / 2) < 2, path)
          assert.equal(geometry.below, true)
          assert.equal(geometry.overflow, false)
        }
      }
      await page.keyboard.press('p')
      assert.equal(await group.getAttribute('data-layout'), 'below')
      assert.equal(await page.locator('.case-cover-hero').isVisible(), true)
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await page.keyboard.press('p')
      await page.keyboard.press('p')
      await page.keyboard.press('p')
      await page.waitForTimeout(1300)
      assert.equal(await page.locator('.case-legacy-intro').evaluate(el => getComputedStyle(el).opacity), '1')
      await page.keyboard.press('p')
      assert.equal(await group.getAttribute('data-layout'), 'below')
    })

    test('presentation intro pins behind media, fades with overlap and restores on scroll back', async (t) => {
      const page = await visit(t, '/hjemla/', { reducedMotion: 'no-preference' })
      await page.waitForTimeout(1200)
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 })
        await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
        await page.waitForTimeout(100)
        const measure = () => page.locator('.case-lead').evaluate(el => {
          const copy = el.querySelector('.case-lead__copy')
          return { top: el.getBoundingClientRect().top, copyTop: copy.getBoundingClientRect().top,
            copyHeight: copy.offsetHeight, opacity: Number(getComputedStyle(copy).opacity),
            mediaTop: el.nextElementSibling.getBoundingClientRect().top }
        })
        const start = await measure()
        assert.equal(start.opacity, 1)
        const overlapScroll = start.mediaTop - start.copyTop - start.copyHeight / 2
        await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), overlapScroll)
        await page.waitForTimeout(100)
        const middle = await measure()
        assert.ok(Math.abs(middle.top - start.top) < 2, 'intro stays in place')
        assert.ok(middle.opacity > 0.35 && middle.opacity < 0.65, 'partial coverage fades the text')
        await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), start.mediaTop - start.copyTop + 20)
        await page.waitForTimeout(100)
        assert.equal((await measure()).opacity, 0)
        await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
        await page.waitForTimeout(100)
        assert.equal((await measure()).opacity, 1)
      }
      await page.keyboard.press('p')
      await page.waitForTimeout(100)
      assert.equal(await page.locator('.case-presentation-sticky').count(), 0)
      await page.keyboard.press('p')
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.waitForTimeout(100)
      assert.equal(await page.locator('.case-presentation-sticky').count(), 0)
    })

    test('project title blocks fit every team with consistent typography and readable mobile cells', async (t) => {
      const page = await visit(t, '/micromilspec/')
      for (const path of casePaths) {
        await page.goto(base + path)
        const contributors = page.locator('.title-block__contributors')
        if (await contributors.count()) {
          assert.equal((await contributors.textContent()).includes('Anders Drage'), false, path)
        }
        assert.ok((await page.locator('.title-block__role dd').textContent()).trim())
        if (path === '/micromilspec/') {
          const developers = page.locator('.title-block__credit').filter({ has: page.locator('dt', { hasText: 'Development' }) })
          assert.equal(await developers.count(), 1)
          assert.equal((await contributors.textContent()).includes('Mark Larratt'), false)
          assert.ok((await contributors.textContent()).includes('Martin S'))
        }
        if (path === '/finn/') {
          const designers = page.locator('.title-block__credit').filter({ has: page.locator('dt', { hasText: 'Designers' }) })
          assert.equal(await designers.count(), 1)
          assert.equal(await designers.locator('dd span').count(), 2)
        }
        for (const width of [1440, 390]) {
          await page.setViewportSize({ width, height: 900 })
          await page.evaluate(() => document.fonts.ready)
          const result = await page.locator('.case-title-block').evaluate(el => {
            const cells = [...el.querySelectorAll('.title-block__cell')]
            return {
              labelFont: getComputedStyle(el.querySelector('dt')).fontFamily,
              labelSize: getComputedStyle(el.querySelector('dt')).fontSize,
              nameFont: getComputedStyle(el.querySelector('dd')).fontFamily,
              nameSize: getComputedStyle(el.querySelector('dd')).fontSize,
              tracking: getComputedStyle(el.querySelector('dd')).letterSpacing,
              firstHeight: el.querySelector('.title-block__project').offsetHeight,
              overflow: document.documentElement.scrollWidth > innerWidth,
              fits: cells.every(cell => {
                const bounds = cell.getBoundingClientRect()
                const name = cell.querySelector('dd').getBoundingClientRect()
                const label = cell.querySelector('dt').getBoundingClientRect()
                return name.left >= bounds.left && name.right <= bounds.right && name.bottom <= bounds.bottom && name.top >= label.bottom
              }),
            }
          })
          assert.ok(result.labelFont.includes('PPSupplyMono'), path)
          // WebKit preserves its 9px minimum rendered label size at 75% zoom.
          assert.equal(result.labelSize, width <= 600 && engine === 'webkit' ? '12px' : '9px')
          assert.ok(result.nameFont.includes('DragePlantin'))
          assert.equal(result.nameSize, '14px')
          assert.equal(result.tracking, '-0.28px')
          assert.ok(Math.abs(result.firstHeight - (width <= 600 ? 70 : 60)) <= 1, `${path}: header height allows one CSS pixel of zoom rounding`)
          assert.equal(result.overflow, false, path)
          assert.equal(result.fits, true, path)
        }
      }
    })

    test('every project opening shows its first media above the fold without covering the intro', async (t) => {
      const page = await visit(t, '/hjemla/')
      for (const path of casePaths) {
        await page.goto(base + path)
        for (const [width, height] of [[1440, 900], [1440, 600], [390, 844], [390, 667], [320, 568], [844, 390]]) {
          await page.setViewportSize({ width, height })
          await page.evaluate(() => document.fonts.ready)
          const geometry = await page.locator('.case-lead, .case-legacy-lead').evaluate(el => {
            const copy = el.querySelector('.case-lead__copy, .case-legacy-copy').getBoundingClientRect()
            const media = el.nextElementSibling.querySelector('img, video').getBoundingClientRect()
            return { peek: innerHeight - media.top, gap: media.top - copy.bottom }
          })
          assert.ok(geometry.peek >= 48, `${path} ${width}×${height}: ${geometry.peek}px of media visible`)
          assert.ok(geometry.gap >= 10, `${path}: intro remains uncovered`)
        }
      }
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
      const page = await visit(t, '/timeline/')
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
          ['/timeline/', '.archive-year, .archive-type', '.archive-list li'],
          ['/finn/', '.case-title-block dt, .case-title-block dd', '.title-block__cell'],
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
      assert.equal(await links.count(), 8)
      const names = await links.evaluateAll((links) => links.map((link) => link.getAttribute('aria-label')))
      assert.ok(names.every(Boolean))
      assert.equal(new Set(names).size, 8)
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
      await page.locator('.world-page[data-path="/about/"] .praise-invitation').click()
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
        await ready(page, '/timeline/')
        const scrollToBottom = async () => {
          const top = await page.locator('.world-page:not([inert])').evaluate((el) => {
            el.scrollTo({ top: el.scrollHeight, behavior: 'instant' })
            return el.scrollTop
          })
          assert.ok(top > 100, 'the page really was scrolled')
        }
        await scrollToBottom()
        await page.locator('.corner-links a[href="/timeline/"]').click()
        await activeWorld(page, '/timeline/')
        await scrollToBottom()
        const positions = await page.evaluate(() => {
          const from = document.querySelector('.world-page[data-path="/timeline/"]')
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
        await activeWorld(page, '/timeline/')
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

    test('legacy History URLs redirect to Timeline without losing query or fragment', async (t) => {
      for (const path of ['/history', '/history/', '/history/index.html']) {
        const page = await visit(t, `${path}?source=bookmark#innhold`)
        await page.waitForURL('**/timeline/?source=bookmark#innhold')
        await ready(page, '/timeline/')
        assert.equal(await page.getByRole('main').getAttribute('aria-label'), 'Timeline')
        assert.equal(await page.locator('a[href="/history/"]').count(), 0)
      }
    })

    test('Timeline uses the new route and keeps only the English NSB entry', async (t) => {
      const page = await visit(t, '/timeline/')
      await ready(page, '/timeline/')
      assert.equal(await page.getByRole('main').getAttribute('aria-label'), 'Timeline')
      assert.equal(await page.locator('.archive-name').filter({ hasText: 'NSB' }).count(), 1)
      assert.equal(await page.locator('.archive-name').filter({ hasText: 'NSB' }).textContent(), 'NSB Yearly Report')
      assert.equal(await page.locator('a[href="/archive/"]').count(), 0)
      await page.locator('.site-header a[href="/about/"]').click()
      await activeWorld(page, '/about/')
      await page.locator('.corner-links a[href="/timeline/"]').click()
      await activeWorld(page, '/timeline/')
      await page.goBack()
      await activeWorld(page, '/about/')
      await page.goForward()
      await activeWorld(page, '/timeline/')
    })

    test('interrupted camera trips preserve world and card transforms through pan and landing', async (t) => {
      const page = await visit(t, '/about/', { reducedMotion: 'no-preference' })
      await ready(page, '/praise/')
      await page.locator('.world-page[data-path="/about/"] .praise-invitation').click()
      for (const [path, elapsed] of [['/timeline/', 300], ['/people/', 850], ['/about/', 80]]) {
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
        const links = [document.querySelector('.world-page[data-path="/about/"] .praise-invitation'), document.querySelector('.site-header a[href="/about/"]'), document.querySelector('.corner-links a'), document.querySelector('.world-page[data-path="/about/"] .site-footer a[href="/archived-work/"]')]
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
      await page.locator('.world-page[data-path="/about/"] .praise-invitation').click()
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

    test('opening map falls back when CSS zoom miscalculates viewport widths', async (t) => {
      for (const width of [390, 1440]) {
        const page = await visit(t, '/', { viewport: { width, height: width === 390 ? 844 : 900 }, reducedMotion: 'no-preference' }, () => {
          // Safari 26.3 reports support but resolves 100vw as 400vw at zoom .25.
          const measure = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth').get
          Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get() {
            const value = measure.call(this)
            return this.matches('.world-page') && this.closest('.world')?.style.zoom === '0.25' ? value * 4 : value
          } })
          const animate = Element.prototype.animate
          window.heldMapAnimations = []
          Element.prototype.animate = function (...args) {
            const animation = animate.apply(this, args)
            if (document.body.classList.contains('world-map-intro') && this.matches('.world-map-camera, .world-page')) {
              animation.pause()
              animation.currentTime = 0
              window.heldMapAnimations.push(animation)
            }
            return animation
          }
        })
        for (let load = 0; load < 2; load++) {
          if (load) await page.reload({ waitUntil: 'domcontentloaded' })
          await page.waitForFunction(() => window.heldMapAnimations.length === 2)
          assert.equal(await page.locator('.world').evaluate(el => el.style.zoom), '')
          const cards = await page.locator('.world-page').evaluateAll(elements => elements.map(el => el.getBoundingClientRect().toJSON()))
          assert.equal(cards.length, 6)
          for (const card of cards) {
            assert.ok(Math.abs(card.width / width - .2125) < .005, 'cards remain at quarter scale')
            assert.ok(card.x >= 0 && card.y >= 0 && card.right <= width && card.bottom <= page.viewportSize().height)
          }
          await page.evaluate(() => window.heldMapAnimations.forEach(animation => animation.play()))
          await page.waitForFunction(() => !document.body.matches('.world-map-intro, .is-entering-home'))
          assert.equal(await page.locator('.world-map-camera').count(), 0)
          assert.equal(await page.locator('.world-page:not([inert])').evaluate(el => Math.round(el.getBoundingClientRect().width)), width)
        }
      }
    })

    test('opening map paints all six pages inside desktop and phone viewports on a slow connection', async (t) => {
      for (const width of [390, 1440]) {
        const page = await visit(t, '/', { viewport: { width, height: width === 390 ? 844 : 900 }, isMobile: width === 390, hasTouch: width === 390, reducedMotion: 'no-preference' }, () => {
          const fetchPage = window.fetch
          window.fetch = async (url, options) => {
            if (/^\/(about|praise|timeline|people|archived-work)\/$/.test(String(url))) await new Promise(resolve => setTimeout(resolve, 500))
            return fetchPage(url, options)
          }
          const animate = Element.prototype.animate
          window.heldMapAnimations = []
          Element.prototype.animate = function (...args) {
            const animation = animate.apply(this, args)
            if (document.body.classList.contains('world-map-intro') && this.matches('.world-map-camera, .world-page')) {
              animation.pause()
              animation.currentTime = 0
              window.heldMapAnimations.push(animation)
            }
            return animation
          }
        })
        await page.waitForFunction(() => window.heldMapAnimations.length === 2)
        const loading = page.locator('.world-page[data-load-state="loading"]')
        assert.equal(await loading.count(), 5)
        assert.equal(await loading.locator('.page-state__mark, .page-state__story').count(), 0, 'loading cards do not reuse the error branding')
        assert.ok(await loading.locator('.page-state__content').evaluateAll(elements => elements.every(el => getComputedStyle(el).visibility === 'hidden')), 'inactive loading cards are plain')
        const cards = await page.locator('.world-page').evaluateAll(elements => elements.map(el => {
          const r = el.getBoundingClientRect()
          return { path: el.dataset.path, x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }
        }))
        assert.equal(cards.length, 6)
        assert.ok(Math.abs(cards[0].x / width - .14375) < .01, 'map begins at the left inset')
        assert.ok(Math.abs(cards[0].y / page.viewportSize().height - (width === 390 ? .19875 : .14375)) < .01, 'map begins in the marked upper area')
        const screenshot = await page.screenshot()
        for (const card of cards) {
          assert.ok(card.x >= 0 && card.y >= 0 && card.right <= width && card.bottom <= page.viewportSize().height, `${engine} ${width}: ${JSON.stringify(card)}`)
          const pixel = await sharp(screenshot).extract({ left: Math.round(card.x + card.width * .2), top: Math.round(card.y + card.height * .2), width: 1, height: 1 }).raw().toBuffer()
          assert.ok([...pixel].slice(0, 3).every(channel => channel >= 245), `${card.path} paints a visible card, not just map backdrop`)
        }
        await page.evaluate(() => window.heldMapAnimations.forEach(animation => animation.play()))
        await page.waitForFunction(() => !document.body.matches('.world-map-intro, .is-entering-home'))
        assert.equal(await page.evaluate(() => innerWidth), width)
        await page.locator('.site-header nav a[href="/about/"]').click()
        await activeWorld(page, '/about/')
      }
    })

    test('phone thumbnails fit portrait frames and keep the intro clear after opening and rotation', async (t) => {
      const page = await visit(t, '/', { viewport: { width: 390, height: 700 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' })
      await page.waitForFunction(() => !document.body.matches('.world-map-intro, .is-entering-home'))
      const checkSpacing = async () => {
        assert.equal(await page.evaluate(() => innerWidth), page.viewportSize().width, 'off-screen world pages must not enlarge the phone viewport')
        const geometry = await page.locator('[data-timeline]').evaluate(el => {
          const intro = el.querySelector('.timeline-intro').getBoundingClientRect()
          const first = el.querySelector('[data-copy="1"] .timeline-tile').getBoundingClientRect()
          const previous = el.querySelector('[data-copy="0"] .timeline-tile:last-child').getBoundingClientRect()
          return { left: intro.left, end: intro.right, first: first.left, previous: previous.right }
        })
        assert.ok(geometry.first >= geometry.end + 55, JSON.stringify(geometry))
        assert.ok(geometry.previous <= geometry.left - 34, JSON.stringify(geometry))
      }
      await checkSpacing()
      for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 844 }, { width: 390, height: 700 }]) {
        await page.setViewportSize(viewport)
        await page.waitForTimeout(150)
        await checkSpacing()
      }
      const tile = page.locator('[data-copy="1"] [data-tile-id="hjemla"]')
      await page.locator('[data-timeline]').dispatchEvent('pointerdown', { pointerType: 'touch' })
      await tile.evaluate(el => el.closest('[data-timeline]').scrollLeft = el.offsetLeft + el.offsetWidth / 2 - innerWidth / 2)
      await page.waitForTimeout(200)
      for (const height of [844, 700]) {
        await page.setViewportSize({ width: 390, height })
        await page.waitForTimeout(150)
        const box = await tile.boundingBox()
        assert.ok(Math.abs(box.width / box.height - .75) < .01, 'portrait 3:4 frame')
        assert.ok(box.width <= 390 - 48 + 1, 'enlarged thumbnail fits the phone')
        assert.ok(Math.abs(box.x + box.width / 2 - 195) < 3, 'resize preserves the selected project centre')
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

    test('Uber written story opens without an audio source and returns focus on close', async (t) => {
      const page = await visit(t, '/uber/')
      const read = page.getByRole('button', { name: 'Read the personal story about Uber' })
      assert.equal(await page.locator('[data-project-audio-button], audio[data-project-audio]').count(), 0)
      await read.click()
      const dialog = page.getByRole('dialog')
      assert.equal(await dialog.isVisible(), true)
      assert.match(await dialog.textContent(), /Are you still in SF/)
      assert.match(await dialog.textContent(), /long after the project is finished/)
      await page.keyboard.press('Escape')
      assert.equal(await dialog.isVisible(), false)
      assert.equal(await read.evaluate(el => el === document.activeElement), true)
      await read.click()
      await page.getByRole('button', { name: 'Close transcript' }).click()
      assert.equal(await dialog.isVisible(), false)
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
        assert.equal(documents.length, saveData ? 0 : casePaths.length)
        assert.equal(documents.length, new Set(documents).size)
      }
    })

    test('settled thumbnails stop writing styles and wake again after navigation', async (t) => {
      const page = await visit(t, '/', { reducedMotion: 'no-preference' })
      await page.waitForFunction(() => !document.body.matches('.world-map-intro, .is-entering-home'))
      const idleWrites = async () => page.locator('[data-timeline]').evaluate(el => new Promise(resolve => {
        let writes = 0
        const observer = new MutationObserver(records => { writes += records.length })
        observer.observe(el, { subtree: true, attributes: true, attributeFilter: ['style'] })
        setTimeout(() => { observer.disconnect(); resolve(writes) }, 250)
      }))
      await page.waitForTimeout(500)
      assert.equal(await idleWrites(), 0)
      const tile = page.locator('.timeline-copy[data-copy="1"] [data-tile-id="hjemla"]')
      await tile.evaluate(el => el.closest('[data-timeline]').scrollTo({ left: el.offsetLeft - (innerWidth - el.offsetWidth) / 2, behavior: 'instant' }))
      await page.waitForTimeout(1000)
      assert.ok(Number(await tile.evaluate(el => getComputedStyle(el).scale)) > 1.19)
      await tile.click()
      await page.waitForURL('**/hjemla/')
      await page.waitForTimeout(600)
      await page.locator('.case-close').click()
      await page.waitForURL(base + '/')
      await page.waitForTimeout(1200)
      assert.equal(await idleWrites(), 0)
      await page.locator('[data-timeline]').dispatchEvent('wheel', { deltaY: 250 })
      await page.waitForTimeout(90)
      assert.ok(await page.locator('.timeline-copy').first().evaluate(el => Boolean(el.style.transform)), 'scroll wakes the spring after return')
    })

    test('case autoplay starts when visible after same-document project navigation', async (t) => {
      const page = await visit(t, '/')
      await ready(page, '/')
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await page.locator('[data-copy="1"] [data-tile-id="micromilspec"]').click()
      await page.waitForURL('**/micromilspec/')
      const video = page.locator('.case-below video').first()
      await video.scrollIntoViewIfNeeded()
      await page.waitForFunction(() => document.querySelector('.case-below video').currentTime > 0)
    })

    test('project navigation keeps case content still and returns instantly at desktop and mobile sizes', async (t) => {
      const page = await visit(t, '/', {}, () => {
        addEventListener('pagereveal', event => { window.hasNavigationTransition = Boolean(event.viewTransition) })
      })
      await ready(page, '/')
      for (const [width, height, reducedMotion] of [[1440, 900, 'no-preference'], [390, 844, 'no-preference'], [390, 844, 'reduce']]) {
        await page.setViewportSize({ width, height })
        await page.emulateMedia({ reducedMotion })
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
        for (const id of ['micromilspec', 'uber']) {
          const tile = page.locator(`[data-copy="1"] [data-tile-id="${id}"]`)
          await page.locator('[data-timeline]').dispatchEvent('wheel', { deltaY: 0 })
          await tile.evaluate(el => {
            el.closest('[data-timeline]').scrollTo({ left: el.offsetLeft + el.offsetWidth / 2 - innerWidth / 2, behavior: 'instant' })
          })
          await page.waitForTimeout(500)
          // Loop normalization may move the visible instance into another copy.
          const visibleTile = page.locator(`[data-tile-id="${id}"]`).filter({ visible: true })
          const clickTarget = await visibleTile.evaluateAll(els => els.findIndex(el => {
            const rect = el.getBoundingClientRect()
            return rect.left < innerWidth && rect.right > 0
          }))
          await visibleTile.nth(clickTarget).click()
          await page.waitForURL(`**/${id}/`, { waitUntil: 'domcontentloaded' })
          const entry = await page.locator('[data-case-root]').evaluate(async el => {
            await new Promise(requestAnimationFrame)
            return {
              transition: window.hasNavigationTransition === true,
              // Inspect page layers; controls inside the case may still animate.
              animations: [el, ...el.querySelectorAll('.case-lead, .case-legacy-lead, .case-below, .case-lead__intro, .case-legacy-intro, .case-title-block, .title-block__credit dd')]
                .flatMap(node => node.getAnimations()).map(a => a.id || a.animationName || 'scripted'),
              opacity: getComputedStyle(el.querySelector('.case-lead__intro, .case-legacy-intro')).opacity,
              hidden: el.getBoundingClientRect().height === 0,
            }
          })
          if (reducedMotion === 'reduce') assert.equal(entry.transition, false)
          if (reducedMotion === 'reduce') assert.deepEqual(entry.animations, [], `${id}: reduced motion skips the entrance`)
          else assert.ok(entry.animations.every(name => name.startsWith('project-intro-') || name === 'project-details-enter'), `${id}: only the approved intro and media entrance animate`)
          assert.equal(entry.opacity, '1')
          assert.equal(entry.hidden, false)
          if (reducedMotion === 'reduce') assert.equal(await page.locator('html.project-reveal-active').count(), 0)
          if (id === 'uber') await page.goBack({ waitUntil: 'domcontentloaded' })
          else await page.locator('.case-close').click()
          await page.waitForURL(base + '/')
          await ready(page, '/')
          const returned = await page.evaluate(id => {
            const tile = [...document.querySelectorAll(`[data-tile-id="${id}"]`)].find(el => {
              const r = el.getBoundingClientRect()
              return r.right > 0 && r.left < innerWidth
            })
            return { visible: Boolean(tile), animated: tile?.getAnimations().length,
              transition: window.hasNavigationTransition === true,
              navigating: document.querySelectorAll('.timeline-tile.is-navigating').length }
          }, id)
          assert.equal(returned.visible, true, `${id}: return keeps the selected project on screen`)
          assert.equal(returned.animated, 0)
          assert.equal(returned.transition, false)
          assert.equal(returned.navigating, 0)
        }
      }
    })

    test('Uber background interpolates across page layers and resets on close', async (t) => {
      const page = await visit(t, '/', {}, () => {
        const start = document.startViewTransition.bind(document)
        document.startViewTransition = update => {
          const transition = start(update)
          transition.ready.then(() => {
            window.surfaceAnimations = document.getAnimations()
            window.surfaceAnimations.forEach(a => { a.pause(); a.currentTime = 0 })
          }, () => {})
          return transition
        }
      })
      await ready(page, '/')
      await page.locator('[data-timeline]').dispatchEvent('wheel', { deltaY: 0 })
      await page.locator('[data-copy="1"] [data-tile-id="uber"]').evaluate(el => {
        el.closest('[data-timeline]').scrollLeft = el.offsetLeft + el.offsetWidth / 2 - innerWidth / 2
      })
      await page.waitForTimeout(500)
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      const tiles = page.locator('[data-tile-id="uber"]')
      const visible = await tiles.evaluateAll(els => els.findIndex(el => {
        const r = el.getBoundingClientRect(); return r.left < innerWidth && r.right > 0
      }))
      await tiles.nth(visible).click()
      await page.waitForFunction(() => window.surfaceAnimations?.some(a => a.transitionProperty === '--page-surface'))
      await page.evaluate(() => window.surfaceAnimations.forEach(a => { a.currentTime = 450 }))
      const surfaces = await page.evaluate(() => [
        getComputedStyle(document.body).backgroundColor,
        getComputedStyle(document.querySelector('#site-layout > main'), '::before').backgroundColor,
        getComputedStyle(document.querySelector('.case-below.work-media')).backgroundColor,
        getComputedStyle(document.querySelector('#site-layout .site-footer')).backgroundColor,
      ])
      assert.equal(new Set(surfaces).size, 1, `all page surfaces share the same intermediate color: ${surfaces.join(', ')}`)
      assert.notEqual(surfaces[0], 'rgb(250, 250, 250)')
      assert.notEqual(surfaces[0], 'rgb(233, 233, 233)')
      // Close while the thumbnail and color are still entering.
      await page.locator('.case-close').click()
      await page.waitForURL(base + '/')
      await page.waitForFunction(() => getComputedStyle(document.body).backgroundColor === 'rgb(250, 250, 250)')
      assert.equal(await page.locator('body').getAttribute('data-case-theme'), null)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      for (const [id, color] of [['houeland', 'rgb(233, 233, 233)'], ['boligmappa', 'rgb(218, 218, 218)'], ['nettavisen', 'rgb(218, 218, 218)']]) {
        await page.goto(base + '/' + id + '/')
        assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor), color)
        assert.equal(await page.locator('#site-layout .site-footer').evaluate(el => getComputedStyle(el).backgroundColor), color)
      }
      await page.goto(base + '/uber/')
      assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(233, 233, 233)')
      assert.equal(await page.locator('body').evaluate(el => el.getAnimations().length), 0)
      await page.keyboard.press('ArrowRight')
      await page.waitForURL(url => url.pathname !== '/uber/')
      assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(250, 250, 250)')
    })

    test('project reveal staggers actual intro lines before media enters', async (t) => {
      for (const width of [1440, 390]) {
        const page = await visit(t, '/', { viewport: { width, height: width === 390 ? 844 : 900 }, isMobile: width === 390, hasTouch: width === 390 }, () => {
          const start = document.startViewTransition.bind(document)
          document.startViewTransition = update => {
            const transition = start(update)
            transition.ready.then(() => {
              window.revealAnimations = document.getAnimations().filter(a => Number.isFinite(a.effect.getComputedTiming().endTime))
              window.revealAnimations.forEach(animation => { animation.pause(); animation.currentTime = 0 })
            }, () => {})
            return transition
          }
          window.documentIdentity = crypto.randomUUID()
        })
        await ready(page, '/')
        const identity = await page.evaluate(() => window.documentIdentity)
        await page.emulateMedia({ reducedMotion: 'no-preference' })
        const tile = page.locator('[data-copy="1"] [data-tile-id="micromilspec"]')
        await page.locator('[data-timeline]').dispatchEvent('wheel', { deltaY: 0 })
        await tile.evaluate(el => { el.closest('[data-timeline]').scrollLeft = el.offsetLeft + el.offsetWidth / 2 - innerWidth / 2 })
        await page.waitForTimeout(500)
        await tile.hover()
        await page.waitForTimeout(300)
        await tile.click()
        await page.waitForURL('**/micromilspec/')
        await page.waitForFunction(() => window.revealAnimations?.some(animation => animation.animationName === 'project-thumbnail-reveal'))
        assert.equal(await page.evaluate(() => window.documentIdentity), identity, 'project reveal retains the same document')
        assert.equal(await page.evaluate(() => performance.getEntriesByType('navigation').length), 1)
        const frame = () => page.evaluate(() => {
          const style = pseudo => getComputedStyle(document.documentElement, pseudo)
          const image = style('::view-transition-old(project-thumbnail)')
          const group = style('::view-transition-group(project-thumbnail)')
          const intro = document.querySelector('.case-lead__intro').getBoundingClientRect().toJSON()
          const block = document.querySelector('.case-title-block').getBoundingClientRect().toJSON()
          return { transform: image.transform, opacity: image.opacity, width: group.width, height: group.height,
            caseOpacity: getComputedStyle(document.querySelector('.case-lead__copy')).opacity, introScale: new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.case-lead__copy')).transform).a, caseTransform: getComputedStyle(document.querySelector('[data-case-root]')).transform,
            rootSnapshot: getComputedStyle(document.documentElement).viewTransitionName, intro, block }
        })
        assert.equal(await page.locator('html.project-reveal-active').count(), 1, 'arrival resize events must not cancel the reveal')
        const details = page.locator('[data-layout="presentation"] + .case-below, body > .project-audio')
        assert.equal(await details.count(), 2)
        const media = page.locator('[data-layout="presentation"] + .case-below')
        const mediaRest = await media.boundingBox()
        const notesRest = await page.locator('body > .project-audio').boundingBox()
        assert.deepEqual(await details.evaluateAll(nodes => nodes.map(node => getComputedStyle(node).visibility)), ['hidden', 'hidden'], 'notes and project imagery wait for the thumbnail')
        const start = await frame()
        assert.equal(start.rootSnapshot, 'none', 'the case remains live beneath the independent thumbnail snapshots')
        assert.equal(start.caseOpacity, '1')
        assert.equal(start.introScale, 1)
        const lines = page.locator('.project-intro-line')
        assert.ok(await lines.count() >= 3)
        const originalCopy = await page.locator('.case-lead__intro').textContent()
        assert.ok((await lines.evaluateAll(nodes => nodes.map(node => getComputedStyle(node).opacity))).every(opacity => opacity === '0'))
        assert.equal(start.caseTransform, 'none')
        const pixels = await sharp(await page.screenshot()).stats()
        assert.ok(pixels.channels.slice(0, 3).some(channel => channel.stdev > 25), 'the held thumbnail is painted, not an empty layer')
        await page.evaluate(() => window.revealAnimations.forEach(animation => { animation.currentTime = 180 }))
        const earlyTravel = await page.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.documentElement, '::view-transition-old(project-thumbnail)').transform).m42)
        assert.ok(earlyTravel < 50, 'the opening starts gently enough to read the reveal')
        await page.evaluate(() => window.revealAnimations.forEach(animation => { animation.currentTime = 490 }))
        const middle = await frame()
        assert.deepEqual(await details.evaluateAll(nodes => nodes.map(node => getComputedStyle(node).opacity)), ['0', '0'])
        assert.equal(middle.opacity, '1')
        assert.equal(middle.width, start.width)
        assert.equal(middle.height, start.height)
        const lineOpacities = await lines.evaluateAll(nodes => nodes.map(node => Number(getComputedStyle(node).opacity)))
        assert.ok(lineOpacities[0] > lineOpacities[1] && lineOpacities[1] > lineOpacities[2], 'lines enter at a steady stagger')
        assert.equal(lineOpacities[2], 0, 'later lines wait their turn')
        assert.deepEqual(middle.intro, start.intro, 'line entrance preserves the paragraph layout')
        const travel = await page.evaluate(() => {
          const matrix = new DOMMatrixReadOnly(getComputedStyle(document.documentElement, '::view-transition-old(project-thumbnail)').transform)
          return { x: matrix.m41, y: matrix.m42, scale: matrix.a }
        })
        assert.equal(travel.x, 0)
        assert.equal(travel.scale, 1)
        assert.ok(travel.y > 50)
        await page.evaluate(() => window.revealAnimations.filter(a => !a.id.startsWith('project-intro-')).forEach(a => a.finish()))
        assert.deepEqual(await details.evaluateAll(nodes => nodes.map(node => getComputedStyle(node).visibility)), ['hidden', 'hidden'], 'media waits for the last line, even after the thumbnail finishes')
        await page.evaluate(() => window.revealAnimations.filter(a => a.id.startsWith('project-intro-')).forEach(a => a.finish()))
        await page.waitForFunction(() => !document.documentElement.classList.contains('project-reveal-active'))
        assert.equal(await lines.count(), 0, 'plain text is restored for natural reflow and selection')
        assert.equal(await page.locator('.case-lead__intro').textContent(), originalCopy)
        assert.deepEqual((await frame()).intro, start.intro, 'restoring text does not change its wrapping or height')
        await page.evaluate(() => document.getAnimations().filter(a => a.id === 'project-details-enter').forEach(a => { a.pause(); a.currentTime = 100 }))
        const settled = await frame()
        assert.equal(settled.introScale, 1)
        assert.equal(settled.caseOpacity, '1')
        const fading = await details.evaluateAll(nodes => nodes.map(node => Number(getComputedStyle(node).opacity)))
        assert.ok(fading.every(opacity => opacity > 0 && opacity < 1), 'both sections fade only after the reveal finishes')
        const mediaEntering = await media.boundingBox()
        assert.ok(mediaEntering.y > mediaRest.y && mediaEntering.y < mediaRest.y + 48, 'the first case image rises while it fades in')
        assert.equal(mediaEntering.x, mediaRest.x, 'the media stays horizontally centred')
        assert.equal(mediaEntering.width, mediaRest.width)
        assert.deepEqual(await page.locator('body > .project-audio').boundingBox(), notesRest, 'the notes dock fades without moving')
        await page.evaluate(() => document.getAnimations().filter(a => a.id === 'project-details-enter').forEach(a => a.finish()))
        assert.deepEqual(await media.boundingBox(), mediaRest, 'the media lands at its normal position without a layout jump')
        assert.deepEqual(await details.evaluateAll(nodes => nodes.map(node => getComputedStyle(node).opacity)), ['1', '1'])
        assert.deepEqual((await frame()).intro, settled.intro, 'fading the lower sections does not move the settled intro')
        await page.reload()
        assert.deepEqual(await details.evaluateAll(nodes => nodes.map(node => getComputedStyle(node).opacity)), ['1', '1'], 'direct visits show the content immediately')
        assert.equal(await page.locator('html.project-reveal-active').count(), 0, 'reload cannot replay the consumed reveal')
        await page.locator('.case-close').click()
        await page.waitForURL(base + '/')
        assert.equal(await page.locator('[data-project-reveal-source]').count(), 0)
      }
    })

    test('partly visible project clicks move neighbouring tiles outward without losing their snapshots', async (t) => {
      for (const width of [1440, 390]) {
        for (const selected of ['off-market', 'hjemla']) {
          const page = await visit(t, '/', { viewport: { width, height: width === 390 ? 844 : 900 }, isMobile: width === 390, hasTouch: width === 390 }, () => {
            const start = document.startViewTransition.bind(document)
            document.startViewTransition = update => {
              window.neighbourSources = [...document.querySelectorAll('a.timeline-tile')]
                .filter(node => node.style.viewTransitionName.startsWith('project-neighbour-'))
                .map(node => ({ name: node.style.viewTransitionName, bounds: node.getBoundingClientRect().toJSON(), scale: node.getBoundingClientRect().width / node.offsetWidth }))
              const transition = start(update)
              transition.ready.then(() => {
                window.openAnimations = document.getAnimations().filter(a => Number.isFinite(a.effect.getComputedTiming().endTime))
                window.openAnimations.forEach(a => { a.pause(); a.currentTime = 0 })
              }, () => {})
              return transition
            }
          })
          await ready(page, '/')
          await page.emulateMedia({ reducedMotion: 'no-preference' })
          await page.locator('[data-timeline]').dispatchEvent('wheel', { deltaY: 0 })
          const tile = page.locator(`[data-copy="1"] [data-tile-id="${selected}"]`)
          await tile.evaluate((el, selected) => {
            el.closest('[data-timeline]').scrollLeft = selected === 'off-market'
              ? el.offsetLeft - innerWidth * .58
              : el.offsetLeft + el.offsetWidth - innerWidth * .42
          }, selected)
          await page.waitForTimeout(650)
          const bounds = await tile.locator('img').boundingBox()
          const x = (Math.max(0, bounds.x) + Math.min(width, bounds.x + bounds.width)) / 2
          if (width === 390) await page.touchscreen.tap(x, bounds.y + bounds.height / 2)
          else await page.mouse.click(x, bounds.y + bounds.height / 2)
          await page.waitForURL(`**/${selected}/`)
          await page.waitForFunction(() => window.openAnimations?.some(a => a.animationName === 'project-thumbnail-reveal'))
          const sources = await page.evaluate(() => window.neighbourSources)
          assert.ok(sources.length > 0, 'the neighbouring project is captured even when the selected tile is mostly offscreen')
          const frame = () => page.evaluate(() => window.neighbourSources.map(({ name }) => {
            const style = getComputedStyle(document.documentElement, `::view-transition-old(${name})`)
            const transform = new DOMMatrixReadOnly(style.transform)
            return { x: transform.m41, y: transform.m42, opacity: style.opacity, animation: style.animationName }
          }))
          assert.ok((await frame()).every(item => item.x === 0 && item.opacity === '1' && item.animation === 'project-neighbour-exit'))
          await page.evaluate(() => window.openAnimations.forEach(a => a.currentTime = 220))
          const middle = await frame()
          assert.ok(middle.every(item => item.y === 0 && item.opacity === '1'))
          assert.ok(middle.every(item => selected === 'off-market' ? item.x < 0 : item.x > 0), 'neighbours leave away from the selected project')
          await page.evaluate(() => window.openAnimations.forEach(a => a.currentTime = 580))
          const end = await frame()
          sources.forEach((source, index) => {
            const displacement = end[index].x * source.scale
            assert.ok(selected === 'off-market' ? source.bounds.right + displacement < 0 : source.bounds.left + displacement > width, 'the entire neighbour clears the viewport')
          })
          await page.locator('.case-close').click()
          await page.waitForURL(base + '/')
          await page.waitForFunction(() => !document.documentElement.classList.contains('project-reveal-active'))
          assert.equal(await page.locator('[data-project-neighbour-styles]').count(), 0)
          assert.equal(await page.locator('[style*="view-transition-name"]').count(), 0)
        }
      }
    })

    test('closing a project brings its thumbnail back up and reverses an interrupted opening', async (t) => {
      for (const width of [1440, 390]) {
        const height = width === 390 ? 844 : 900
        const page = await visit(t, '/', { viewport: { width, height }, isMobile: width === 390, hasTouch: width === 390 }, () => {
          const start = document.startViewTransition.bind(document)
          document.startViewTransition = update => {
            const transition = start(update)
            transition.ready.then(() => {
              window.openAnimations = document.getAnimations().filter(a => Number.isFinite(a.effect.getComputedTiming().endTime))
              window.openAnimations.forEach(a => { a.pause(); a.currentTime = 0 })
            }, () => {})
            return transition
          }
          const animate = Element.prototype.animate
          Element.prototype.animate = function (...args) {
            const animation = animate.apply(this, args)
            if (this.matches('.timeline-tile__image')) {
              animation.pause()
              animation.currentTime = 0
              window.returnAnimation = animation
            }
            return animation
          }
          window.documentIdentity = 'persistent'
        })
        await ready(page, '/')
        await page.emulateMedia({ reducedMotion: 'no-preference' })
        await page.locator('[data-timeline]').dispatchEvent('wheel', { deltaY: 0 })
        for (const interrupted of [false, true]) {
          const tile = page.locator('[data-copy="1"] [data-tile-id="micromilspec"]')
          await tile.evaluate(el => { el.closest('[data-timeline]').scrollLeft = el.offsetLeft + el.offsetWidth / 2 - innerWidth / 2 })
          await page.waitForTimeout(600)
          const resting = await tile.locator('img').boundingBox()
          const imageScale = resting.height / await tile.locator('img').evaluate(el => el.offsetHeight)
          // Coordinate input avoids automation's scrollIntoView moving a magnified tile.
          if (width === 390) await page.touchscreen.tap(resting.x + resting.width / 2, resting.y + resting.height / 2)
          else await page.mouse.click(resting.x + resting.width / 2, resting.y + resting.height / 2)
          await page.waitForURL('**/micromilspec/')
          await page.waitForFunction(() => window.openAnimations?.some(a => a.animationName === 'project-thumbnail-reveal'))
          let displacement
          if (interrupted) {
            await page.evaluate(() => window.openAnimations.forEach(a => { a.currentTime = 490 }))
            displacement = await page.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.documentElement, '::view-transition-old(project-thumbnail)').transform).m42)
          } else {
            await page.evaluate(() => window.openAnimations.forEach(a => a.finish()))
            await page.waitForFunction(() => !document.documentElement.classList.contains('project-reveal-active'))
          }
          if (interrupted) await page.keyboard.press('Escape')
          else if (width === 390) await page.locator('.case-close').tap()
          else await page.locator('.case-close').click()
          await page.waitForURL(base + '/')
          await page.waitForFunction(() => window.returnAnimation?.id === 'project-thumbnail-return' && window.returnAnimation.playState === 'paused')
          assert.equal(await page.locator('[data-case-root], .case-close').count(), 0, 'the case closes without waiting for the thumbnail')
          assert.equal(await page.evaluate(() => window.documentIdentity), 'persistent')
          assert.equal(await tile.evaluate(el => getComputedStyle(el).outlineStyle), 'none', 'returning image has no stationary focus border')
          const start = await tile.locator('img').boundingBox()
          if (interrupted) assert.ok(Math.abs(start.y - resting.y - displacement * imageScale) < 3, 'quick close reverses from the opening position')
          else {
            assert.ok(Math.abs(start.y - resting.y - (height - resting.y + 32) * .6) < 3, 'return travel is 40% shorter')
            assert.ok(await page.evaluate(() => window.returnAnimation.effect.getTiming().duration) < 350, 'the shorter return completes more quickly')
          }
          assert.ok(Math.abs(start.width - resting.width) < 2, `${width}px: the returning thumbnail preserves its size`)
          await page.evaluate(() => { window.returnAnimation.currentTime = window.returnAnimation.effect.getTiming().duration / 2 })
          const middle = await tile.locator('img').boundingBox()
          assert.ok(middle.y < start.y && middle.y > resting.y, 'thumbnail visibly moves upward toward its slot')
          await page.evaluate(() => window.returnAnimation.finish())
          await page.waitForFunction(() => !document.getAnimations().some(a => a.id === 'project-thumbnail-return'))
          const end = await tile.locator('img').boundingBox()
          assert.ok(Math.abs(end.x - resting.x) < 2 && Math.abs(end.y - resting.y) < 2, 'return lands without a position jump')
          assert.equal(await tile.locator('img').evaluate(el => el.style.transform), '')
          await page.waitForTimeout(300)
          const settled = await tile.locator('img').boundingBox()
          assert.ok(Math.abs(settled.width - end.width) < 1 && Math.abs(settled.y - end.y) < 1, 'focus cannot resize the image after the return finishes')
          assert.equal(await tile.evaluate(el => getComputedStyle(el).outlineStyle), 'none')
        }
        await page.emulateMedia({ reducedMotion: 'reduce' })
        const keyboardTile = page.locator('[data-copy="1"] [data-tile-id="micromilspec"]')
        await keyboardTile.focus()
        await page.keyboard.press('Enter')
        await page.waitForURL('**/micromilspec/')
        await page.keyboard.press('Escape')
        await page.waitForURL(base + '/')
        assert.equal(await page.evaluate(() => document.getAnimations().some(a => a.id === 'project-thumbnail-return')), false)
        assert.equal(await keyboardTile.evaluate(el => el === document.activeElement), true)
        assert.equal(await keyboardTile.evaluate(el => getComputedStyle(el).outlineStyle), 'solid', 'keyboard navigation retains a visible focus indicator')
      }
    })

    test('project reveal clears on scroll or immediate close and skips unavailable transitions', async (t) => {
      const page = await visit(t, '/', {}, () => {
        const start = document.startViewTransition.bind(document)
        document.startViewTransition = update => {
          const transition = start(update)
          if (sessionStorage.getItem('test:skip-reveal')) transition.skipTransition()
          else transition.ready.then(() => {
            window.revealAnimations = document.getAnimations().filter(a => Number.isFinite(a.effect.getComputedTiming().endTime))
            window.revealAnimations.forEach(animation => animation.pause())
          }, () => {})
          return transition
        }
      })
      await ready(page, '/')
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      for (const action of ['scroll', 'close', 'resize', 'skip']) {
        if (action === 'skip') await page.evaluate(() => sessionStorage.setItem('test:skip-reveal', '1'))
        const tile = page.locator('[data-tile-id="micromilspec"]').filter({ visible: true })
        const index = await tile.evaluateAll(els => els.findIndex(el => { const r = el.getBoundingClientRect(); return r.left < innerWidth && r.right > 0 }))
        await tile.nth(index).click()
        await page.waitForURL('**/micromilspec/')
        if (action !== 'skip') {
          await page.waitForFunction(() => window.revealAnimations?.length)
          if (action === 'scroll') await page.mouse.wheel(0, 100)
          if (action === 'resize') await page.setViewportSize({ width: 1450, height: 900 })
        }
        if (action !== 'close') {
          await page.waitForFunction(() => !document.documentElement.classList.contains('project-reveal-active'))
          assert.equal(await page.locator('.case-lead__intro').evaluate(el => getComputedStyle(el).opacity), '1')
        }
        await page.locator('.case-close').click()
        await page.waitForURL(base + '/')
        await ready(page, '/')
        assert.equal(await page.locator('[data-project-reveal-source]').count(), 0)
      }
    })


    test('same-document cases retain URLs, history, focus and one set of controls across repeated visits', async (t) => {
      const page = await visit(t, '/')
      await ready(page, '/')
      await page.evaluate(async () => { await document.fonts.ready; window.documentIdentity = 'overview'; window.savedTimeline = document.querySelector('[data-timeline]') })
      await page.locator('[data-timeline]').dispatchEvent('wheel', { deltaY: 0 })
      for (const id of ['uber', 'boligmappa', 'micromilspec']) {
        const tile = page.locator(`[data-copy="1"] [data-tile-id="${id}"]`)
        await tile.evaluate(el => { el.closest('[data-timeline]').scrollLeft = el.offsetLeft + el.offsetWidth / 2 - innerWidth / 2 })
        await page.waitForTimeout(500)
        const left = await page.locator('[data-timeline]').evaluate(el => el.scrollLeft)
        const copies = page.locator(`[data-tile-id="${id}"]`)
        const visible = await copies.evaluateAll(els => els.findIndex(el => { const r = el.getBoundingClientRect(); return r.left > 0 && r.right < innerWidth }))
        const bounds = await copies.nth(visible).boundingBox()
        await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
        await page.waitForURL(`**/${id}/`)
        assert.equal(await page.evaluate(() => window.documentIdentity), 'overview')
        assert.equal(await page.locator('.case-close').count(), 1)
        assert.equal(await page.locator('[data-case-root]').count(), 1)
        assert.equal(await page.getByRole('main').count(), 1)
        await page.keyboard.press('c')
        assert.equal(await page.locator('.case-lead, .case-legacy-lead').getAttribute('data-layout'), 'columns', 'one key press changes the active case exactly once')
        await page.keyboard.press('p')
        await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'instant' }))
        await page.waitForFunction(() => Math.abs(scrollY - 500) < 2)
        await page.goBack()
        await page.waitForSelector('.project-overview-suspended', { state: 'detached' })
        assert.equal(await page.evaluate(() => window.savedTimeline === document.querySelector('[data-timeline]')), true)
        assert.ok(Math.abs(await page.locator('[data-timeline]').evaluate(el => el.scrollLeft) - left) < 2, `${id} timeline position: ${await page.locator('[data-timeline]').evaluate(el => el.scrollLeft)} vs ${left}`)
        assert.equal(await page.locator('[data-case-root], .case-close, .project-audio, .case-image-viewer').count(), 0)
        await page.goForward()
        await page.waitForSelector('[data-case-root]')
        assert.equal(await page.evaluate(() => window.documentIdentity), 'overview')
        assert.ok(Math.abs(await page.evaluate(() => scrollY) - 500) < 2)
        await page.keyboard.press('ArrowRight')
        await page.waitForURL(`**/${FEATURED_ORDER[(FEATURED_ORDER.indexOf(id) + 1) % FEATURED_ORDER.length]}/`)
        assert.equal(await page.locator('.case-close').count(), 1)
        await page.locator('.case-close').click()
        await page.waitForURL(base + '/')
        assert.equal(await page.evaluate(() => window.documentIdentity), 'overview')
        await page.evaluate(() => sessionStorage.removeItem('credits:layout'))
      }
      await page.locator('[data-copy="1"] [data-tile-id="micromilspec"]').click()
      await page.waitForURL('**/micromilspec/')
      await page.setViewportSize({ width: 390, height: 844 })
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      await page.locator('.case-close').click()
      await page.waitForURL(base + '/')
      assert.ok(await page.locator('[data-tile-id="micromilspec"]').evaluateAll(els => els.some(el => { const r = el.getBoundingClientRect(); return r.right > 0 && r.left < innerWidth })), 'rotation while a case is open preserves the selected thumbnail')
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.locator('.site-header a[href="/about/"]').click()
      await activeWorld(page, '/about/')
      await page.evaluate(() => {
        const link = document.createElement('a'); link.href = '/uber/'; link.textContent = 'Open Uber'; link.id = 'test-case-link'
        document.querySelector('.world-page[data-path="/about/"] main').prepend(link)
      })
      await page.locator('#test-case-link').click()
      await page.waitForURL('**/uber/')
      await page.locator('.case-close').click()
      await page.waitForURL('**/about/')
      assert.equal(await page.evaluate(() => window.documentIdentity), 'overview')
      await activeWorld(page, '/about/')
    })

    test('pending project loads can be cancelled and failed loads retain ordinary navigation', async (t) => {
      const page = await visit(t, '/', {}, () => { window.documentIdentity = 'overview'; document.startViewTransition = undefined })
      await ready(page, '/')
      let release
      await page.route('**/micromilspec/', async route => {
        await new Promise(resolve => { release = resolve })
        await route.continue()
      })
      const tile = page.locator('[data-copy="1"] [data-tile-id="micromilspec"]')
      await tile.click()
      await page.waitForFunction(() => document.querySelector('a[aria-busy="true"]'))
      await page.keyboard.press('Escape')
      release()
      await page.waitForTimeout(300)
      assert.equal(new URL(page.url()).pathname, '/')
      assert.equal(await page.locator('a[aria-busy="true"], .is-navigating').count(), 0)
      await page.unroute('**/micromilspec/')
      await tile.click()
      await page.waitForURL('**/micromilspec/')
      assert.equal(await page.evaluate(() => window.documentIdentity), 'overview', 'unsupported animation still uses same-document navigation')
      assert.equal(await page.locator('html.project-reveal-active').count(), 0)
      await page.locator('.case-close').click()
      await page.waitForURL(base + '/')
      await page.route('**/hjemla/', route => route.request().isNavigationRequest() ? route.continue() : route.fulfill({ status: 503, body: 'Unavailable' }))
      await page.locator('[data-copy="1"] [data-tile-id="hjemla"]').click()
      await page.waitForURL('**/hjemla/')
      await page.waitForSelector('[data-case-root]')
      assert.equal(await page.evaluate(() => performance.getEntriesByType('navigation')[0].name.endsWith('/hjemla/')), true)
    })

    test('intro stays clear of the enlarged first thumbnail during forward and reverse scrolling', async (t) => {
      const page = await visit(t, '/')
      await ready(page, '/')
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await page.locator('[data-timeline]').dispatchEvent('wheel', { deltaX: 0, deltaY: 0 })
      const result = await page.evaluate(async () => {
        const scroller = document.querySelector('[data-timeline]')
        const intro = document.querySelector('.timeline-intro')
        const tile = document.querySelector('.timeline-copy[data-copy="1"] .timeline-tile')
        const start = tile.offsetLeft - innerWidth * 0.7
        let gap = Infinity
        let samples = 0
        for (const offset of [0, 300, 450, 200, 400, 0]) {
          scroller.scrollTo({ left: start + offset, behavior: 'instant' })
          for (let frame = 0; frame < 18; frame++) {
            await new Promise(requestAnimationFrame)
            const copy = intro.getBoundingClientRect()
            const image = tile.querySelector('img').getBoundingClientRect()
            if (!intro.hidden && copy.right > 0 && image.left < innerWidth) {
              gap = Math.min(gap, image.left - copy.right)
              samples++
            }
          }
        }
        return { gap, samples }
      })
      assert.ok(result.samples > 20, 'sample the visible intro throughout the scroll')
      assert.ok(result.gap >= 55, `keep at least 55px clear: ${result.gap}px`)
    })

    test('centre magnification follows scrolling without changing layout and respects reduced motion', async (t) => {
      const page = await visit(t, '/')
      await ready(page, '/')
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      const tile = page.locator('.timeline-copy[data-copy="1"] [data-tile-id="hjemla"]')
      const scroller = page.locator('[data-timeline]')
      await scroller.dispatchEvent('wheel', { deltaX: 0, deltaY: 0 })
      const position = await tile.evaluate(el => el.offsetLeft + el.offsetWidth / 2 - innerWidth / 2)
      const initialWidth = await tile.evaluate(el => el.offsetWidth)
      const scale = () => tile.evaluate(el => Number(getComputedStyle(el).scale))
      const settle = async offset => {
        await scroller.evaluate((el, left) => el.scrollTo({ left, behavior: 'instant' }), position + offset)
        await page.waitForTimeout(900)
      }
      await settle(0)
      assert.ok(Math.abs(await scale() - 1.2) < 0.001, 'centre thumbnail is 20% larger')
      await settle(400)
      const passingScale = await scale()
      assert.ok(passingScale > 1 && passingScale < 1.2, 'size decreases gradually away from centre')
      assert.equal(await tile.evaluate(el => el.offsetWidth), initialWidth, 'magnification does not shift the underlying layout')
      await settle(0)
      assert.ok(Math.abs(await scale() - 1.2) < 0.001, 'reversing scroll restores full magnification')
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.waitForFunction(() => [...document.querySelectorAll('.timeline-tile')].every(el => getComputedStyle(el).scale === '1'))
    })

    test('rounded corners setting applies across pages and restores original radii', async (t) => {
      const page = await visit(t, '/')
      await ready(page, '/')
      const radius = locator => locator.evaluate(el => getComputedStyle(el).borderTopLeftRadius)
      const image = page.locator('.timeline-copy[data-copy="1"] .timeline-tile img').first()
      const originalRadius = await radius(image)
      assert.equal(originalRadius, '8px')
      await page.keyboard.press('s')
      const toggle = page.getByRole('checkbox', { name: 'Rounded corners', exact: true })
      assert.equal(await toggle.isChecked(), true)
      await toggle.uncheck()
      assert.equal(await radius(image), '0px')
      assert.equal(await radius(page.locator('.debug-panel')), '0px')
      await page.goto(`${base}/houeland/`)
      await page.locator('.case-title-block').waitFor()
      assert.equal(await radius(page.locator('.case-title-block')), '0px')
      assert.equal(await radius(page.locator('.portfolio-asset').first()), '0px')
      await page.reload()
      await page.locator('.case-title-block').waitFor()
      assert.equal(await radius(page.locator('.case-title-block')), '0px')
      await page.keyboard.press('s')
      assert.equal(await toggle.isChecked(), false)
      await toggle.check()
      assert.equal(await radius(page.locator('.case-title-block')), '8px')
      assert.equal(await radius(page.locator('.portfolio-asset').first()), '8px')
      assert.equal(await radius(page.locator('.debug-panel')), '8px')
      await page.goBack()
      await ready(page, '/')
      assert.equal(await radius(image), originalRadius, 'returning to a cached page picks up the latest preference')
    })

    test('same size thumbnail setting swaps covers, survives navigation and restores originals', async (t) => {
      const page = await visit(t, '/')
      await ready(page, '/')
      const tiles = page.locator('.timeline-copy[data-copy="1"] .timeline-tile')
      await page.keyboard.press('s')
      const toggle = page.getByRole('checkbox', { name: 'Same size thumbnails', exact: true })
      assert.equal(await toggle.isChecked(), true, 'same size thumbnails are the default')
      const defaultHeight = await tiles.first().evaluate(tile => tile.offsetHeight)
      assert.ok(Math.abs(defaultHeight - 900 * 0.43 * 1.3) < 1, 'thumbnail base size is 30% larger')
      await toggle.uncheck()
      const originals = await tiles.locator('img').evaluateAll(images => images.map(image => image.getAttribute('src')))
      await toggle.check()
      const sizes = await tiles.evaluateAll(tiles => tiles.map(tile => ({ width: tile.offsetWidth, height: tile.offsetHeight, image: tile.querySelector('img').getAttribute('src') })))
      assert.equal(new Set(sizes.map(size => `${size.width}/${size.height}`)).size, 1)
      assert.ok(sizes.every(size => size.image.startsWith('/images/andersdrage-')))
      const selected = tiles.filter({ has: page.locator('img[src$="andersdrage-hjemla-cover.webp"]') })
      await page.locator('[data-timeline]').dispatchEvent('wheel', { deltaX: 0, deltaY: 0 })
      await selected.evaluate(tile => tile.closest('[data-timeline]').scrollTo({ left: tile.offsetLeft - (innerWidth - tile.offsetWidth) / 2, behavior: 'instant' }))
      await selected.click()
      await page.waitForURL('**/hjemla/')
      await page.locator('.case-close').click()
      await ready(page, '/')
      assert.ok((await tiles.locator('img').evaluateAll(images => images.map(image => image.getAttribute('src')))).every(src => src.startsWith('/images/andersdrage-')))
      if (!(await toggle.isVisible())) await page.keyboard.press('s')
      assert.equal(await toggle.isChecked(), true)
      await toggle.uncheck()
      assert.deepEqual(await tiles.locator('img').evaluateAll(images => images.map(image => image.getAttribute('src'))), originals)
    })

    test('desktop project names follow magnification without hover', async (t) => {
      const page = await visit(t, '/', { reducedMotion: 'no-preference' })
      await page.waitForFunction(() => !document.body.matches('.world-map-intro, .is-entering-home'))
      const firstLabel = page.locator('[data-copy="1"] [data-tile-id="micromilspec"] .timeline-tile__hover-label')
      assert.ok(await firstLabel.evaluate(el => Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).m42) < 1 && getComputedStyle(el).opacity === '1'), 'first arrival shows MICROMILSPEC below its image')
      await page.mouse.move(5, 5)
      await page.locator('[data-timeline]').dispatchEvent('wheel', { deltaY: 0 })
      await page.locator('[data-timeline]').evaluate(el => { el.scrollLeft += 40 })
      await page.waitForTimeout(900)
      assert.ok(await firstLabel.evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).m42 > 1), 'first arrival name moves immediately instead of holding until centre')
      const tile = page.locator('[data-copy="1"] [data-tile-id="hjemla"]')
      const label = tile.locator('.timeline-tile__hover-label')
      const move = async center => {
        await tile.evaluate((el, center) => { el.closest('[data-timeline]').scrollLeft = el.offsetLeft + el.offsetWidth / 2 - center }, center)
        await page.waitForTimeout(900)
      }
      const offset = () => label.evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).m42)
      await move(1120)
      assert.ok(await tile.evaluate(el => {
        const text = document.createRange()
        text.selectNodeContents(el.querySelector('.timeline-tile__hover-label'))
        return Number(el.style.getPropertyValue('--tile-magnification')) < 1.13
          && text.getBoundingClientRect().bottom > el.querySelector('img').getBoundingClientRect().bottom + 3
      }), 'name emerges before thumbnail growth reaches 13%')
      await move(720)
      assert.equal(await tile.evaluate(el => el.matches(':hover')), false)
      assert.ok(Math.abs(await offset()) < 1, 'name emerges as the image grows, without a pointer over it')
      const centreOffsets = []
      for (const center of [780, 750, 720, 690, 660]) {
        await move(center)
        centreOffsets.push(await offset())
      }
      const steps = centreOffsets.slice(1).map((value, i) => value - centreOffsets[i])
      assert.ok(steps.every(step => step > 1), 'every scroll step continues down through the centre without holding')
      assert.ok(Math.max(...steps) - Math.min(...steps) < .5, 'vertical travel stays linear across the centre')
      await move(720)
      const scale = () => tile.evaluate(el => Number(el.style.getPropertyValue('--tile-magnification')))
      const centredScale = await scale()
      await move(432)
      assert.ok(await offset() > 5, 'name continues down with scrolling')
      assert.ok(await label.evaluate(el => Number(getComputedStyle(el).opacity) < 1), 'departing name fades')
      assert.ok(await scale() < centredScale, 'name and image shrink together')
      await move(144)
      const hiddenOffset = await offset()
      assert.ok(hiddenOffset > 20)
      assert.equal(await label.evaluate(el => getComputedStyle(el).opacity), '0')
      const r = await tile.boundingBox()
      await page.mouse.move(144, r.y + r.height / 2)
      await page.waitForTimeout(700)
      assert.equal(await tile.evaluate(el => el.matches(':hover')), true)
      assert.ok(Math.abs(await offset() - hiddenOffset) < 1, 'hover cannot reveal a name away from the centre')
      await page.mouse.move(5, 5)
      await move(720)
      assert.ok(Math.abs(await offset()) < 1, 'reverse scrolling reveals the name again')
    })

    test('touch project names emerge near centre then move down and fade', async (t) => {
      const page = await visit(t, '/', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' })
      await page.waitForFunction(() => !document.body.matches('.world-map-intro, .is-entering-home'))
      await page.locator('[data-timeline]').dispatchEvent('pointerdown', { pointerType: 'touch' })
      const tile = page.locator('[data-copy="1"] [data-tile-id="hjemla"]')
      const label = tile.locator('.timeline-tile__hover-label')
      const move = async center => {
        await tile.evaluate((el, center) => { el.closest('[data-timeline]').scrollLeft = el.offsetLeft + el.offsetWidth / 2 - center }, center)
        await page.waitForTimeout(380)
      }
      const offset = () => label.evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).m42)
      await move(380)
      assert.ok(await offset() < -20, 'approaching thumbnail keeps its name tucked behind the image')
      await move(300)
      assert.ok(await tile.evaluate(el => {
        const text = document.createRange()
        text.selectNodeContents(el.querySelector('.timeline-tile__hover-label'))
        return Number(el.style.getPropertyValue('--tile-magnification')) < 1.13
          && text.getBoundingClientRect().bottom > el.querySelector('img').getBoundingClientRect().bottom + 3
      }), 'touch name emerges early in thumbnail growth')
      await move(195)
      assert.ok(Math.abs(await offset()) < 1, 'the centred thumbnail reveals its name without hover')
      assert.equal(await page.locator('.is-label-revealed').count(), 1)
      assert.ok(await tile.evaluate(el => {
        const text = document.createRange()
        text.selectNodeContents(el.querySelector('.timeline-tile__hover-label'))
        return text.getBoundingClientRect().top - el.querySelector('img').getBoundingClientRect().bottom >= 20
      }), 'revealed text has clear space beneath the enlarged image')
      for (const center of [210, 200, 190, 180]) {
        await move(center)
        const current = await offset()
        if (center === 210) assert.ok(current < -1)
        if (center === 180) assert.ok(current > 1)
      }
      await move(140)
      const retracting = await offset()
      assert.ok(retracting > 2 && retracting < 25, 'name visibly moves down before reaching the viewport edge')
      assert.ok(await label.evaluate(el => Number(getComputedStyle(el).opacity) < 1 && Number(getComputedStyle(el).opacity) > 0), 'departure progressively fades the name')
      await move(105)
      assert.ok(await offset() > retracting + 5, 'further scrolling moves the name farther down')
      await move(-30)
      assert.ok(await offset() > 20, 'passing the centre keeps the exit moving down')
      assert.equal(await label.evaluate(el => getComputedStyle(el).opacity), '0')
      await move(195)
      assert.ok(Math.abs(await offset()) < 1, 'reverse scrolling reveals it again')
      await tile.tap()
      await page.waitForURL('**/hjemla/')
      await page.waitForFunction(() => !document.body.classList.contains('case-entering'))
      await page.locator('.case-close').tap()
      await ready(page, '/')
      await page.waitForFunction(() => !document.documentElement.classList.contains('vt-presentation-out'))
      await page.waitForTimeout(380)
      assert.ok(Math.abs(await offset()) < 1, 'return restores the centred thumbnail name')
      await page.emulateMedia({ reducedMotion: 'reduce' })
      assert.equal(await label.evaluate(el => getComputedStyle(el).transitionDuration), '0s')
      await move(380)
      assert.equal(await label.evaluate(el => getComputedStyle(el).opacity), '0', 'touch hover does not leave a name stuck open after tapping')
    })

    test('mobile case return preserves the clicked wide thumbnail position', async (t) => {
      const page = await visit(t, '/', { viewport: { width: 390, height: 844 } })
      await ready(page, '/')
      await page.locator('[data-timeline]').dispatchEvent('wheel', { deltaX: 0, deltaY: 0 })
      const tile = page.locator('.timeline-copy[data-copy="1"] [data-tile-id="hjemla"]')
      await tile.evaluate(el => el.closest('[data-timeline]').scrollTo({ left: el.offsetLeft - (innerWidth - el.offsetWidth) / 2, behavior: 'instant' }))
      const originalCenter = await tile.evaluate(el => {
        const r = el.getBoundingClientRect()
        return r.left + r.width / 2
      })
      await tile.click()
      await page.waitForURL('**/hjemla/')
      await page.locator('.case-close').click()
      await ready(page, '/')
      const restoredCenter = await page.locator('[data-tile-id="hjemla"]').evaluateAll(tiles => {
        const r = tiles.map(el => el.getBoundingClientRect()).find(r => r.right > 0 && r.left < innerWidth)
        return r ? r.left + r.width / 2 : null
      })
      assert.notEqual(restoredCenter, null, 'the same project remains visible on mobile')
      assert.ok(Math.abs(restoredCenter - originalCenter) < 3, `return keeps its original screen position: ${originalCenter} → ${restoredCenter}`)
    })

    test('cold homepage reveal captures a decoded thumbnail over a ready intro', async (t) => {
      const page = await visit(t, '/', { reducedMotion: 'no-preference' }, () => {
        const start = document.startViewTransition.bind(document)
        document.startViewTransition = update => {
          const image = document.querySelector('[data-project-reveal-source]')
          window.capturedDecodedThumbnail = Boolean(image?.complete && image.naturalWidth)
          const transition = start(update)
          transition.ready.then(() => {
            window.introReady = Boolean(document.querySelector('.case-lead__intro')?.textContent.trim()) && document.fonts.check('16px DragePlantin')
          }, () => {})
          return transition
        }
      })
      await page.waitForFunction(() => !document.body.classList.contains('world-map-intro') && !document.body.classList.contains('is-entering-home'))
      const tile = page.locator('.timeline-copy[data-copy="1"] a').first()
      await tile.click()
      await page.waitForURL('**/micromilspec/')
      await page.waitForFunction(() => window.introReady === true)
      assert.equal(await page.evaluate(() => window.capturedDecodedThumbnail), true)
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
      for (const file of ['andersdrage-agens-001.png', 'andersdrage-agens-002.jpg', 'andersdrage-agens-003.jpg', 'andersdrage-agens-004.jpg', 'andersdrage-aprila-001.jpg', 'andersdrage-brevio-001.jpg', 'andersdrage-logos-001.jpg', 'andersdrage-nike-001.jpg', 'andersdrage-pressworks-001.jpg', 'andersdrage-pressworks-002.jpg']) {
        assert.equal(await grid.locator(`img[data-media-src="/images/${file}"]`).count(), 1)
      }
      assert.equal(await grid.locator('img[src="/images/andersdrage-nettavisen-001.jpg"]').count(), 0)
      await page.goto(base + '/nettavisen/')
      const moved = page.locator('img[src="/images/andersdrage-nettavisen-001.jpg"]')
      assert.equal(await moved.count(), 1)
      await page.locator('.portfolio-item').filter({ has: moved }).scrollIntoViewIfNeeded()
      await page.waitForFunction(() => {
        const img = document.querySelector('img[src="/images/andersdrage-nettavisen-001.jpg"]')
        return img.complete && img.naturalWidth > 0
      })
      assert.equal(await page.locator('.site-footer__dragon img').getAttribute('src'), '/images/footer-dragon-still.png')
    })

    test('Boligmappa shows 000 then its comparison and supports keyboard and pointer control', async (t) => {
      for (const width of [1440, 390]) {
        const page = await visit(t, '/boligmappa/', { viewport: { width, height: width === 390 ? 844 : 900 } })
        const items = page.locator('.case-below.work-media > .portfolio-item')
        assert.equal(await items.first().locator('img').getAttribute('src'), '/images/andersdrage-boligmappa-001.jpeg')
        assert.equal(await items.nth(1).locator('[data-case-comparison]').count(), 1)
        const frame = page.locator('[data-case-comparison]')
        const slider = page.getByRole('slider', { name: 'Boligmappa website before and after' })
        await frame.scrollIntoViewIfNeeded()
        await frame.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())))
        assert.equal(await frame.evaluate(el => el.getAnimations({ subtree: true }).length), 0, 'reduced motion skips the demonstration')
        await slider.focus()
        await page.keyboard.press('ArrowRight')
        assert.equal(await slider.inputValue(), '51')
        await page.keyboard.press('Home')
        assert.equal(await slider.inputValue(), '0')
        await page.keyboard.press('End')
        assert.equal(await slider.inputValue(), '100')
        assert.equal(new URL(page.url()).pathname, '/boligmappa/', 'slider arrows do not navigate between projects')
        const box = await frame.boundingBox()
        await page.mouse.move(box.x + box.width * .25, box.y + box.height / 2)
        await page.mouse.down()
        await page.mouse.move(box.x + box.width * .75, box.y + box.height / 2, { steps: 8 })
        await page.mouse.up()
        assert.ok(Math.abs(Number(await slider.inputValue()) - 75) <= 1)
        assert.equal(await slider.getAttribute('aria-valuetext'), '75% before, 25% after')
        const inset = await frame.locator('.case-comparison__before').evaluate(el => Number(el.style.clipPath.match(/inset\(\S+\s+([\d.]+)%/)[1]))
        assert.ok(Math.abs(inset - 25) <= 1, 'reveal follows the dragged position within pointer rounding')
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      }
    })

    test('Boligmappa comparison demonstrates once when visible and yields immediately to interaction', async (t) => {
      const page = await visit(t, '/boligmappa/', { reducedMotion: 'no-preference' })
      const frame = page.locator('[data-case-comparison]')
      const slider = frame.locator('input')
      const demoCount = () => frame.evaluate(el => el.getAnimations({ subtree: true }).filter(animation => animation.id === 'comparison-demonstration').length)
      assert.equal(await demoCount(), 0, 'offscreen comparison stays still')
      await frame.scrollIntoViewIfNeeded()
      await page.waitForFunction(() => document.querySelector('[data-case-comparison]').getAnimations({ subtree: true }).length === 2)
      await page.waitForFunction(() => document.querySelector('[data-case-comparison]').getAnimations({ subtree: true }).length === 0)
      assert.equal(await slider.inputValue(), '50', 'demonstration returns to the midpoint')
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
      await frame.scrollIntoViewIfNeeded()
      await page.waitForTimeout(350)
      assert.equal(await demoCount(), 0, 'returning to the comparison does not replay the hint')

      await page.reload({ waitUntil: 'domcontentloaded' })
      await frame.scrollIntoViewIfNeeded()
      await page.waitForFunction(() => document.querySelector('[data-case-comparison]').getAnimations({ subtree: true }).length === 2)
      const box = await frame.boundingBox()
      await page.mouse.click(box.x + box.width * .75, box.y + box.height / 2)
      assert.equal(await demoCount(), 0)
      assert.ok(Math.abs(Number(await slider.inputValue()) - 75) <= 1)
      await page.waitForTimeout(500)
      assert.ok(Math.abs(Number(await slider.inputValue()) - 75) <= 1, 'cancelled hint cannot override the visitor')
    })

    test('Uber long-page gallery opens readable images and restores the case on close', async (t) => {
      const page = await visit(t, '/uber/')
      const thumbs = page.locator('[data-case-image]')
      assert.equal(await thumbs.count(), 5)
      assert.equal(await page.locator('img[src="/images/andersdrage-uber-extra-001.jpg"]').count(), 0)
      assert.equal(await page.locator('img[src="/images/andersdrage-uber-extra-008.jpg"]').count(), 0)
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
      assert.equal(await gallery.locator('img[src="/images/andersdrage-uber-011.jpg"]').count(), 1)
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
      await page.locator('.world-page[data-path="/about/"] .praise-invitation').click()
      await page.locator('.corner-links a[href="/timeline/"]').click()
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
        await page.locator('.world-page[data-path="/about/"] .praise-invitation').click()
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
      await page.locator('.world-page[data-path="/about/"] .praise-invitation').click()
      assert.equal(await page.getByRole('status').filter({ hasText: 'Loading…' }).count(), 1)
      assert.equal(await page.getByRole('status').filter({ hasText: 'Loading…' }).isVisible(), true)
      assert.equal(await page.locator('.world-page[data-path="/praise/"] .page-state__mark, .world-page[data-path="/praise/"] .page-state__story').count(), 0)
      await activeWorld(page, '/praise/')
      await page.locator('.site-header a[href="/about/"]').click()
      release()
      await ready(page, '/praise/')
      await activeWorld(page, '/about/')
      assert.equal(await page.title(), aboutTitle)
      await page.locator('.world-page[data-path="/about/"] .praise-invitation').click()
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
      assert.equal(await page.locator('.timeline-copy[data-copy="1"] a').count(), 8)
      await page.locator('.site-header a[href="/about/"]').click()
      await page.locator('.world-page:not([inert]) .site-footer a[href="/archived-work/"]').click()
      await page.getByRole('button', { name: 'Try again' }).click()
      await ready(page, '/archived-work/')
      assert.equal(await page.locator('.archived-grid__item').count(), 163)
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
      const expected = [['intro', 2], ['agens', 4], ['aprila', 5], ['humming-people', 11], ['brevio', 17], ['klp', 4], ['just', 4], ['abelee', 2], ['pressworks', 2], ['kindly', 3], ['changemaker', 8], ['nike', 1], ['houelandek', 16], ['kaos', 14], ['brathwait', 23], ['tone', 4], ['godt-levert', 6], ['hellstrom', 2], ['hmkg', 4], ['pelp', 10], ['lego', 3], ['mountain-milk', 6], ['daccord', 9], ['poster', 1], ['yearly-report', 1], ['lettering', 1]]
      const blocks = page.locator('.archived-project')
      assert.deepEqual(await blocks.evaluateAll((blocks) => blocks.map((block) => [block.dataset.project, block.querySelectorAll('button').length])), expected)
      assert.equal(await page.locator('.archived-card').count(), 1)
      const indices = await blocks.locator('button').evaluateAll((buttons) => buttons.map((button) => Number(button.dataset.index)).sort((a, b) => a - b))
      assert.deepEqual(indices, Array.from({ length: 163 }, (_, i) => i))
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
      await page.locator('.world-page[data-path="/about/"] .praise-invitation').click()
      await page.getByRole('button', { name: 'Try again' }).waitFor()
      const main = page.getByRole('main')
      assert.equal(await main.locator('h1').count(), 0)
      assert.equal(await main.getByRole('button').count(), 1)
      assert.equal(await main.getByRole('status').textContent(), 'We couldn’t load this page.Please try again.')
      assert.equal(await main.locator('.page-state__story').textContent(), 'HC SVNT DRACONES')
      await main.locator('.page-state__mark img').evaluate(image => image.decode())
      const layout = await main.evaluate((main) => {
        const content = main.querySelector('.page-state__content').getBoundingClientRect()
        const mark = main.querySelector('.page-state__mark').getBoundingClientRect()
        const image = main.querySelector('.page-state__mark img')
        return {
          contentX: content.x + content.width / 2,
          contentY: content.y + content.height / 2,
          centerX: innerWidth / 2,
          centerY: innerHeight / 2,
          markWidth: mark.width,
          before: getComputedStyle(main, '::before').content,
          imageSrc: image.getAttribute('src'),
          imageLoaded: image.complete && image.naturalWidth > 0,
        }
      })
      assert.ok(Math.abs(layout.contentX - layout.centerX) < 2)
      assert.ok(Math.abs(layout.contentY - layout.centerY) < 2)
      assert.equal(layout.markWidth, 150)
      assert.equal(layout.before, 'none')
      assert.equal(layout.imageSrc, '/images/dragonmark.svg')
      assert.equal(layout.imageLoaded, true)
    })

    test('page focus has no frame and retry uses the footer hover treatment with visible keyboard focus', async (t) => {
      const page = await visit(t, '/about/', { reducedMotion: 'no-preference' })
      await page.route('**/praise/', (route) => route.fulfill({ status: 503, body: 'Unavailable' }))
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.locator('.world-page[data-path="/about/"] .praise-invitation').click()
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

    test('the updated dragon stays available on failed navigation and the standalone error page', async (t) => {
      const page = await visit(t, '/about/', { reducedMotion: 'no-preference' })
      await page.route('**/praise/', (route) => route.fulfill({ status: 503, body: 'Unavailable' }))
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => document.querySelector('.world-page[data-path="/praise/"]')?.dataset.loadState === 'error')
      await page.locator('.world-page[data-path="/about/"] .praise-invitation').click()
      const mark = page.locator('.world-page:not([inert]) .page-state__mark img')
      await mark.waitFor({ state: 'visible' })
      await mark.evaluate(img => img.decode())
      assert.equal(await mark.getAttribute('src'), '/images/dragonmark.svg')
      assert.equal(await page.locator('.page-state__mark video').count(), 0)
      await page.locator('.site-header a[href="/about/"]').click()
      await activeWorld(page, '/about/')

      await page.goto(base + '/404.html', { waitUntil: 'domcontentloaded' })
      await page.locator('.page-state__mark img').evaluate(img => img.decode())
      assert.equal(await page.locator('.page-state__mark img').getAttribute('src'), '/images/dragonmark.svg')
      assert.equal(await page.getByRole('link', { name: 'Back home' }).count(), 1)
    })

    test('retired case URLs redirect to their intact archive projects', async (t) => {
      const page = await visit(t, '/')
      for (const [id, count] of [['hmkg', 4], ['humming-people', 11], ['brathwait', 23], ['mountain-milk', 6]]) {
        await page.goto(base + `/${id}/`)
        await page.waitForURL('**/archived-work/')
        await ready(page, '/archived-work/')
        assert.equal(await page.locator(`[data-project="${id}"] button`).count(), count)
        assert.equal(await page.locator('[data-case-root]').count(), 0)
      }
    })

    test('Houeland opens with its website video and retains its images and correct neighbours', async (t) => {
      const page = await visit(t, '/')
      await ready(page, '/')
      assert.deepEqual(await page.locator('.timeline-copy[data-copy="1"] a').evaluateAll(links => links.map(link => new URL(link.href).pathname)), casePaths)
      assert.equal(casePaths[3], '/houeland/')
      await page.getByRole('link', { name: 'Houeland', exact: true }).click()
      await page.waitForURL('**/houeland/')
      assert.equal(await page.locator('.title-block__year dd').textContent(), '2026')
      const image = page.locator('.case-below .portfolio-asset img').first()
      await image.scrollIntoViewIfNeeded()
      await image.evaluate(el => el.decode())
      assert.ok(await image.isVisible())
      const movie = page.locator('video[data-media-src="/images/andersdrage-houeland-001.mp4"]')
      assert.equal(await movie.count(), 1)
      assert.equal(await page.locator('[data-case-root] img[src="/images/andersdrage-houeland-cover.webp"]').count(), 0)
      await page.keyboard.press('p')
      assert.equal(await movie.evaluate(el => !!el.closest('.case-cover-hero')), true, 'alternate layout uses the video as its lead')
      await page.keyboard.press('p')
      assert.equal(await page.locator('.case-below .portfolio-asset img').count(), 6, 'presentation retains all six case images')
      assert.equal(await movie.evaluate(el => !!el.closest('.case-below')), true, 'presentation keeps the video before the images')
      assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'), 'https://andersdrage.com/images/sharing-image-3.png?v=1ada1116b6b0')
      await page.keyboard.press('ArrowLeft')
      await page.waitForURL('**/off-market/')
      await page.keyboard.press('ArrowRight')
      await page.waitForURL('**/houeland/')
      await page.keyboard.press('ArrowRight')
      await page.waitForURL('**/boligmappa/')
      await page.goto(base + '/boligmappa/')
      await page.keyboard.press('ArrowRight')
      await page.waitForURL('**/nettavisen/')
      await page.keyboard.press('ArrowRight')
      await page.waitForURL('**/finn/')
    })

    test('an explicit world entry is preserved through a featured case chain and reload', async (t) => {
      const page = await visit(t, '/timeline/')
      // The gallery intentionally opens a lightbox; supply a test link to exercise
      // the supported same-origin case entry without changing production content.
      await page.evaluate(() => {
        const link = document.createElement('a')
        link.href = '/houeland/'
        link.textContent = 'Open test case'
        document.querySelector('.world-page:not([inert]) main').prepend(link)
      })
      await page.getByRole('link', { name: 'Open test case' }).click()
      await page.waitForURL('**/houeland/')
      await page.keyboard.press('ArrowRight')
      await page.waitForURL('**/boligmappa/')
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.keyboard.press('Escape')
      await page.waitForURL('**/timeline/')
    })

    test('selected case close restores the timeline and transcript Escape stays in the case', async (t) => {
      const page = await visit(t, '/', {}, () => sessionStorage.setItem('debug:same-size-thumbnails', '0'))
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
