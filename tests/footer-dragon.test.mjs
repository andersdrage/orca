import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { preview } from 'vite'
import { chromium } from 'playwright'
let server, browser, base
before(async () => {
  server = await preview({ build: { outDir: process.env.DRAGON_TEST_DIST || 'dist' }, logLevel: 'error', preview: { host: '127.0.0.1', port: 0 } })
  base = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch()
})
after(async () => { await browser?.close(); if (server) await new Promise(resolve => server.httpServer.close(resolve)) })
async function visit(t, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', ...options })
  t.after(() => context.close())
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  t.after(() => assert.deepEqual(errors, []))
  return page
}
const rotation = page => page.locator('.footer-dragon-canvas').getAttribute('data-rotation')
const changed = (page, value) => page.waitForFunction(value => document.querySelector('.footer-dragon-canvas')?.dataset.rotation !== value, value)
async function footer(page) {
  await page.locator('.site-footer:not([inert] .site-footer)').filter({ visible: true }).last().scrollIntoViewIfNeeded()
  await page.waitForSelector('.footer-dragon-canvas[data-ready="true"]')
}
test('footer loads lazily, loops without a pause button, rotates on all axes and sleeps offscreen', async t => {
  const page = await visit(t, { reducedMotion: 'no-preference' })
  const requested = []
  page.on('request', r => requested.push(r.url()))
  await page.goto(`${base}/micromilspec/`)
  await page.waitForTimeout(500)
  assert.equal(requested.some(url => /footer-dragon.*\.js/.test(url)), false)
  await footer(page)
  assert.equal(requested.filter(url => /dragon-scroll\/frame-/.test(url)).length, 0)
  let q = await rotation(page); await changed(page, q)
  assert.equal(await page.locator('.footer-dragon-toggle').count(), 0)
  const canvas = page.locator('.footer-dragon-canvas')
  await canvas.focus()
  for (const key of ['ArrowUp', 'ArrowRight', 'q']) {
    q = await rotation(page); await page.keyboard.press(key); await changed(page, q)
  }
  await page.keyboard.press('Home')
  await page.waitForFunction(() => document.querySelector('.footer-dragon-canvas').dataset.rotation === '0.00000,0.00000,0.00000,1.00000')
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForFunction(() => !document.querySelector('.footer-dragon-canvas'))
  await footer(page)
  q = await rotation(page); await changed(page, q)
})
test('mobile drag works with reduced motion and the shared canvas follows mounted footers', async t => {
  const page = await visit(t, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await page.goto(`${base}/about/`)
  await footer(page)
  let q = await rotation(page); await page.waitForTimeout(250); assert.equal(await rotation(page), q)
  const box = await page.locator('.footer-dragon-canvas').boundingBox()
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width * .3, y: box.y + box.height * .3 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width * .7, y: box.y + box.height * .65 }] })
  await changed(page, q)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForFunction(() => document.querySelector('.footer-dragon-canvas').dataset.rotation === '0.00000,0.00000,0.00000,1.00000')
  await page.waitForTimeout(80)
  q = await rotation(page); await page.waitForTimeout(250); assert.equal(await rotation(page), q)
  await page.locator('.footer-dragon-canvas').focus()
  q = await rotation(page); await page.keyboard.press('ArrowRight'); await changed(page, q)
  await page.keyboard.press('Home')
  await page.waitForFunction(() => document.querySelector('.footer-dragon-canvas').dataset.rotation === '0.00000,0.00000,0.00000,1.00000')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  // Simulate the overview replacing its active page while retaining this context.
  await page.evaluate(() => {
    const original = document.querySelector('.footer-dragon-canvas').parentElement
    const next = document.createElement('div')
    next.className = 'site-footer__dragon'
    next.style.cssText = 'position:fixed;top:100px;left:100px;width:100px;height:100px;z-index:9999'
    next.innerHTML = '<img src="/images/footer-dragon-still.png" alt="">'
    original.closest('.site-footer').setAttribute('inert', '')
    document.body.append(next)
    window.testFooter = next
  })
  await page.waitForFunction(() => window.testFooter.querySelector('canvas')?.dataset.ready === 'true')
  assert.equal(await page.locator('.footer-dragon-canvas').count(), 1)
  await page.evaluate(() => window.testFooter.remove())
  await page.waitForFunction(() => !document.querySelector('.footer-dragon-canvas'))
})
test('WebGL failure preserves the still and leaves no unusable controls', async t => {
  const page = await visit(t)
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.startsWith('webgl') ? null : getContext.call(this, type, ...args) }
  })
  await page.goto(`${base}/micromilspec/`)
  await page.locator('.site-footer').scrollIntoViewIfNeeded()
  await page.waitForTimeout(2000)
  assert.equal(await page.locator('.site-footer__dragon img').isVisible(), true)
  assert.equal(await page.locator('.footer-dragon-toggle').count(), 0)
})
for (const mobile of [false, true]) test(`${mobile ? 'touch' : 'mouse'} flick coasts, centers, then restarts an upright loop`, async t => {
  const page = await visit(t, { reducedMotion: 'no-preference', ...(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : {}) })
  await page.goto(`${base}/micromilspec/`)
  await footer(page)
  await page.evaluate(() => {
    const canvas = document.querySelector('.footer-dragon-canvas')
    window.dragonStates = []
    window.dragonSpinRadians = 0
    let previousSpin = null
    new MutationObserver(() => {
      const q = canvas.dataset.rotation.split(',').map(Number)
      if (canvas.dataset.motion === 'coast' && previousSpin) {
        const dot = q.reduce((sum, value, i) => sum + value * previousSpin[i], 0)
        window.dragonSpinRadians += 2 * Math.acos(Math.min(1, Math.abs(dot)))
      }
      previousSpin = canvas.dataset.motion === 'coast' ? q : null
      if (window.dragonStates.at(-1)?.mode !== canvas.dataset.motion) {
        window.dragonStates.push({ mode: canvas.dataset.motion, rotation: canvas.dataset.rotation })
      }
    }).observe(canvas, { attributes: true, attributeFilter: ['data-motion'] })
  })
  const box = await page.locator('.footer-dragon-canvas').boundingBox()
  const cdp = await page.context().newCDPSession(page)
  const start = { x: box.x + box.width * .3, y: box.y + box.height * .3 }
  const end = { x: box.x + box.width * .7, y: box.y + box.height * .6 }
  if (mobile) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
  else await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...start, button: 'left', buttons: 1, clickCount: 1 })
  await page.waitForTimeout(350) // Holding before flicking must not dilute release speed.
  const timestamp = Date.now() / 1000
  const moves = [
    ...[.2, .45, .775, 1].map((fraction, i) => ({ x: start.x + (end.x - start.x) * fraction, y: start.y + (end.y - start.y) * fraction, time: i * .016 })),
    ...Array.from({ length: 6 }, (_, i) => ({ x: end.x + (i + 1) * .2, y: end.y, time: .052 + i * .004 })),
  ]
  for (const { x, y, time } of moves) {
    if (mobile) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }], timestamp: timestamp + time })
    else await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1, timestamp: timestamp + time })
  }
  const releasePoint = moves.at(-1)
  if (mobile) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], timestamp: timestamp + .084 })
  else await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: releasePoint.x, y: releasePoint.y, button: 'left', buttons: 0, clickCount: 1, timestamp: timestamp + .084 })
  await page.waitForFunction(() => window.dragonStates.some(state => state.mode === 'coast'))
  await changed(page, await rotation(page))
  await page.waitForFunction(() => window.dragonStates.some(state => state.mode === 'center'))
  assert.ok(await page.evaluate(() => window.dragonSpinRadians / (Math.PI * 2) > 8), 'flick makes many complete turns before centering')
  const states = await page.evaluate(() => window.dragonStates)
  assert.deepEqual(states.filter(state => ['coast', 'return', 'center'].includes(state.mode)).map(state => state.mode), ['coast', 'return', 'center'])
  assert.equal(states.find(state => state.mode === 'center').rotation, '0.00000,0.00000,0.00000,1.00000')
  await page.waitForSelector('.footer-dragon-canvas[data-motion="auto"]')
  await changed(page, '0.00000,0.00000,0.00000,1.00000')
  const [x, y, z] = (await rotation(page)).split(',').map(Number)
  assert.equal(x, 0); assert.equal(z, 0); assert.ok(y > 0)
})
test('an unavailable prepared mesh retains the footer still', async t => {
  const page = await visit(t)
  await page.route('**/assets/geometry.bin-*.gz', route => route.fulfill({ status: 503, body: 'Unavailable' }))
  await page.goto(`${base}/micromilspec/`)
  await page.locator('.site-footer').scrollIntoViewIfNeeded()
  await page.waitForTimeout(1500)
  assert.equal(await page.locator('.site-footer__dragon img').isVisible(), true)
  assert.equal(await page.locator('.footer-dragon-canvas').count(), 0)
})
for (const mobile of [false, true]) test(`${mobile ? 'touch' : 'mouse'} drag continues through a full turn outside the small canvas`, async t => {
  const page = await visit(t, { ...(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : {}) })
  await page.goto(`${base}/off-market/`)
  await footer(page)
  const box = await page.locator('.footer-dragon-canvas').boundingBox()
  const cdp = await page.context().newCDPSession(page)
  const start = { x: box.x + box.width * .3, y: box.y + box.height * .5 }
  if (mobile) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
  else { await page.mouse.move(start.x, start.y); await page.mouse.down() }
  let previous = (await rotation(page)).split(',').map(Number), total = 0
  for (let i = 1; i <= 10; i++) {
    const next = { x: start.x + box.width * 1.7 * i / 10, y: start.y }
    const before = await rotation(page)
    if (mobile) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [next] })
    else await page.mouse.move(next.x, next.y)
    await changed(page, before)
    const current = (await rotation(page)).split(',').map(Number)
    const dot = previous.reduce((sum, value, j) => sum + value * current[j], 0)
    total += 2 * Math.acos(Math.min(1, Math.abs(dot)))
    previous = current
  }
  assert.ok(total > Math.PI * 2, 'one held gesture rotates beyond 360 degrees')
  assert.equal(await page.locator('.footer-dragon-canvas').getAttribute('data-motion'), 'drag')
  if (mobile) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  else await page.mouse.up()
})
for (const route of ['/off-market/', '/about/']) test(`${route} prepares offscreen and arrives already in the running loop`, async t => {
  const page = await visit(t, { reducedMotion: 'no-preference' })
  await page.goto(`${base}${route}`)
  const figure = page.locator('.site-footer:not([inert] .site-footer) .site-footer__dragon')
  await figure.evaluate(figure => {
    const scroller = figure.closest('.world-page') || document.scrollingElement
    const top = figure.getBoundingClientRect().top
    scroller.scrollBy({ top: top - innerHeight - 400, behavior: 'instant' })
  })
  await page.waitForSelector('.footer-dragon-canvas[data-ready="true"]', { state: 'attached' })
  assert.ok(await figure.evaluate(el => el.getBoundingClientRect().top > innerHeight))
  const prepared = await rotation(page)
  await page.waitForTimeout(250)
  assert.equal(await rotation(page), prepared, 'preloading does not start an offscreen render loop')
  await footer(page)
  await changed(page, prepared)
  assert.equal(await page.locator('.footer-dragon-canvas').getAttribute('data-motion'), 'auto')
  assert.notEqual(await rotation(page), '0.00000,0.00000,0.00000,1.00000')
})

for (const mobile of [false, true]) test(`${mobile ? 'touch' : 'mouse'} repeatedly releases with momentum across short release delays`, async t => {
  const page = await visit(t, { reducedMotion: 'no-preference', ...(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : {}) })
  await page.goto(`${base}/micromilspec/`)
  await footer(page)
  const canvas = page.locator('.footer-dragon-canvas')
  const box = await canvas.boundingBox()
  const cdp = await page.context().newCDPSession(page)
  for (const idle of [20, 170, 230, 700, 400, 180, 40, 1200, 340, 200]) {
    const start = { x: box.x + box.width * .2, y: box.y + box.height * .4 }
    const end = { x: box.x + box.width * .8, y: box.y + box.height * .6 }
    if (mobile) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
    else await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...start, button: 'left', buttons: 1, clickCount: 1 })
    // Real elapsed release delays exercise the boundary missed by immediate-up tests.
    if (mobile) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [end] })
    else await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...end, button: 'left', buttons: 1 })
    await page.waitForTimeout(idle)
    if (mobile) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    else await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...end, button: 'left', buttons: 0, clickCount: 1 })
    await page.waitForTimeout(60)
    assert.equal(await canvas.getAttribute('data-motion'), 'coast', `${idle} ms release delay retains momentum`)
    const released = await rotation(page)
    await changed(page, released)
  }
  await cdp.detach()
})
