/* Verden: index, About og Praise ligger side om side i ETT dokument, og et
   kamera panorerer mellom dem — klikker du Praise fra forsiden, ser du faktisk
   About passere underveis. Ingen WebGL: ren DOM med transform på verdensstripen.

   Nav-lenkene (About/Praise) står fast oppe til høyre; aktiv side markeres med
   rød tekst, som fader inn først når reisen er ferdig.

   Direktebesøk på /about/ eller /praise/ booter samme verden med kameraet
   stående på riktig side; søsknene hentes og monteres rundt. */

import { initArchivedGrid } from './archived-grid.js'
import { isCasePath } from './case-navigation.js'
import { initTimeline } from './timeline.js'
import { isSameTabNavigation } from './link-navigation.js'
import { syncVisibleMedia } from './visible-media.js'
import { createPageStateContent } from './page-state.js'
import { initViewportHeight } from './viewport-height.js'

/* Verdenskartet er 2D: About/Praise ligger mot øst, arkivet ligger UNDER
   forsiden — lenken bor i nedre venstre hjørne, og kameraet panorerer nedover
   for å nå det. Diagonale reiser (f.eks. About → arkiv) panorerer skrått. */
const PAGES = [
  { path: '/', title: 'Selected work', x: 0, y: 0 },
  { path: '/about/', title: 'About', x: 1, y: 0 },
  { path: '/praise/', title: 'Praise', x: 2, y: 0 },
  { path: '/timeline/', title: 'Timeline', x: 0, y: 1 },
  { path: '/people/', title: 'People', x: 1, y: 1 },
  /* Kjelleren: arkivert arbeid ligger en etasje UNDER arkivet — kameraet
     stiger ned forbi arkivlisten for å nå det. */
  { path: '/archived-work/', title: 'Work archive', x: 0, y: 2 },
]
const EASING = 'cubic-bezier(0.32, 0.08, 0.24, 1)'

export function initWorld(header) {
  const selfIndex = PAGES.findIndex((page) => page.path === location.pathname)
  if (selfIndex === -1 || !header) return

  const layout = document.getElementById('site-layout')
  const ownMain = layout?.querySelector('main')
  if (!layout || !ownMain) return
  initViewportHeight()

  /* Chrome ut av kolonnen, verden inn. */
  document.body.prepend(header)
  const world = document.createElement('div')
  world.className = 'world'
  const slots = PAGES.map((page) => {
    const section = document.createElement('section')
    section.className = 'world-page'
    section.dataset.path = page.path
    const column = document.createElement('div')
    column.className = 'world-column'
    section.append(column)
    world.append(section)
    return column
  })

  slots[selfIndex].append(ownMain)
  const ownFooter = layout.querySelector('footer')
  if (ownFooter) slots[selfIndex].append(ownFooter)
  layout.remove()
  document.body.append(world)
  document.body.classList.add('world-mode')
  document.body.classList.toggle('page-home', PAGES[selfIndex].path === '/')

  const sections = [...world.children]
  const skipLink = document.querySelector('.skip-link')
  const titles = PAGES.map((page) => (page.path === location.pathname ? document.title : `${page.title} — Anders Drage`))
  const loads = PAGES.map((_, index) => ({ status: index === selfIndex ? 'ready' : 'idle', promise: null }))
  let cameraIndex = selfIndex
  let travelId = 0
  let mapRasterScale = 1
  let mapCamera = null
  const mapPreparationUntil = performance.now() + 200

  function prepareMain(main, index) {
    main.id = `world-${PAGES[index].path.split('/')[1] || 'home'}-content`
    main.tabIndex = -1
    main.setAttribute('aria-label', PAGES[index].title)
  }

  function focusPage(index) {
    slots[index].querySelector('main')?.focus({ preventScroll: true })
  }

  function syncAccessibility(index, { focus = false } = {}) {
    // Inert preserves the visible cards during travel, but removes hidden pages
    // from keyboard navigation, the accessibility tree, and browser Find.
    sections[index].inert = false
    sections[index].removeAttribute('aria-hidden')
    if (focus) focusPage(index)
    sections.forEach((section, slotIndex) => {
      if (slotIndex === index) return
      section.inert = true
      section.setAttribute('aria-hidden', 'true')
    })
    const main = slots[index].querySelector('main')
    if (skipLink && main) skipLink.href = `#${main.id}`
    syncVisibleMedia(world)
  }

  prepareMain(ownMain, selfIndex)
  syncAccessibility(selfIndex)
  skipLink?.addEventListener('click', (event) => {
    event.preventDefault()
    sections[cameraIndex].scrollTop = 0
    focusPage(cameraIndex)
  })

  const setTransform = (index) => {
    const { x, y } = PAGES[index]
    world.style.transform = `translate3d(${-x * 100}vw, calc(var(--viewport-height) * ${-y}), 0)`
  }
  document.body.dataset.camera = String(cameraIndex)
  setTransform(cameraIndex)

  const navLinks = () => [...header.querySelectorAll('nav a')]
  const cornerLinks = [...document.querySelectorAll('.corner-links a')]

  function updateAriaCurrent(index) {
    navLinks().forEach((link) => {
      if (new URL(link.href).pathname === PAGES[index].path) link.setAttribute('aria-current', 'page')
      else link.removeAttribute('aria-current')
    })
    cornerLinks.forEach((link) => {
      if (new URL(link.href).pathname === PAGES[index].path) link.setAttribute('aria-current', 'page')
      else link.removeAttribute('aria-current')
    })
  }
  updateAriaCurrent(cameraIndex)

  /* Hjørnelenkene (Archive/People) er også kamerabevegelser. */
  cornerLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!isSameTabNavigation(event, link)) return
      event.preventDefault()
      const index = PAGES.findIndex((page) => page.path === new URL(link.href).pathname)
      if (index !== -1 && index !== cameraIndex) navigateTo(index)
    })
  })

  function syncHeaderScrollState() {
    /* Ingen frostet toppbar noe sted i verdenen — logo/nav svever fritt over innholdet. */
    header.classList.remove('is-scrolled')
  }
  syncHeaderScrollState()
  sections.forEach((section, index) => {
    section.addEventListener(
      'scroll',
      () => {
        if (index === cameraIndex) syncHeaderScrollState()
      },
      { passive: true },
    )
  })

  /* Reise-koreografi: avreisesiden skalerer ned til 90 % (bakteppet bak kortene
     kommer til syne), kameraet panorerer mens alle sider står som kort på 90 %,
     og ankomstsiden zoomer opp til 100 % igjen. */
  const TRAVEL_SCALE = 0.85
  const SCALE_MS = 220

  /* ── PROTOTYP: kart-intro ────────────────────────────────────────────────
     Frisk last av forsiden starter utzoomet: hele verdenen som et kart av
     kort (à la reise-tilstanden), holder et beat mens søskensidene monteres,
     og kameraet zoomer så inn på indexen med huskurven. Chrome og index-
     innhold holdes skjult underveis (CSS på body.world-map-intro); når
     zoomen lander, får timeline.js beskjed ('world:map-intro-done') og
     spiller den vanlige entré-koreografien.
     REVERT: slett denne funksjonen + kallet under, PROTOTYP-blokka i
     layout.css, og map-intro-grenen i timeline.js sin entré-blokk. */
  function playMapIntro() {
    if (PAGES[cameraIndex].path !== '/') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    /* Ikke ved case-retur — der eier tilbake-morphen hele ankomsten. */
    try {
      const fromUrl = window.navigation?.activation?.from?.url ?? document.referrer
      if (isCasePath(new URL(fromUrl).pathname)) return
    } catch {
      /* ugyldig referrer → kjør introen */
    }

    const introJourney = travelId
    document.body.classList.add('world-map-intro')
    world.classList.add('is-travelling', 'is-map')
    sections.forEach((section) => {
      section.style.transform = `scale(${TRAVEL_SCALE})`
    })

    /* Fit the three-row world into the current visible viewport. */
    const MAP_SCALE = 0.25
    // Lay out the overview at its displayed resolution, then composite the
    // camera zoom. Six full-resolution page textures are wasteful at 25% size.
    mapRasterScale = CSS.supports('zoom', String(MAP_SCALE)) ? MAP_SCALE : 1
    if (mapRasterScale !== 1) {
      world.style.zoom = String(mapRasterScale)
      // Safari 26.3 accepts zoom but expands nested viewport units by 1/zoom.
      // Check actual layout, not just syntax support, before keeping this
      // raster optimization. The camera transform works without CSS zoom.
      if (Math.abs(sections[0].offsetWidth - innerWidth) > 1) {
        world.style.zoom = ''
        mapRasterScale = 1
      }
    }
    // Keep translation outside the zoomed layout. Safari versions disagree
    // about applying CSS zoom to transform offsets on the same element.
    mapCamera = document.createElement('div')
    mapCamera.className = 'world-map-camera'
    world.before(mapCamera)
    mapCamera.append(world)
    world.style.transform = 'none'
    mapCamera.style.transform = `translate3d(12.5vw, calc(var(--viewport-height) * ${matchMedia('(max-width: 600px)').matches ? 0.18 : 0.125}), 0) scale(${MAP_SCALE / mapRasterScale})`

    const HOLD_MS = 1200
    const ZOOM_MS = 1400
    setTimeout(() => {
      if (introJourney !== travelId) return
      const from = getComputedStyle(mapCamera).transform
      world.classList.remove('is-map')
      const zoom = mapCamera.animate(
        [{ transform: from }, { transform: `translate3d(0, 0, 0) scale(${1 / mapRasterScale})` }],
        { duration: ZOOM_MS, delay: 80, easing: EASING, fill: 'backwards' },
      )
      zoom.id = 'world-camera-zoom'
      /* Kortet folder seg ut UNDERVEIS i flighten — samme varighet og kurve
         som zoomen, så hele ankomsten leses som én bevegelse. */
      const arriving = sections[cameraIndex]
      arriving.style.transform = ''
      const unfold = arriving.animate(
        [{ transform: `scale(${TRAVEL_SCALE})` }, { transform: 'scale(1)' }],
        { duration: ZOOM_MS, delay: 80, easing: EASING, fill: 'backwards' },
      )
      unfold.id = 'world-card-unfold'
      const land = () => {
        if (introJourney !== travelId) return
        mapCamera.replaceWith(world)
        mapCamera = null
        world.style.transformOrigin = ''
        world.style.zoom = ''
        mapRasterScale = 1
        setTransform(cameraIndex)
        world.classList.remove('is-travelling')
        // Let the full-resolution layout settle at rest before starting the
        // word/thumbnail entrance; otherwise Safari pays that cost mid-motion.
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (introJourney !== travelId) return
          document.body.classList.remove('world-map-intro')
          document.body.dispatchEvent(new CustomEvent('world:map-intro-done'))
        }))
      }
      Promise.all([zoom.finished, unfold.finished]).then(land, land)
    }, HOLD_MS)
  }
  playMapIntro()
  /* ── slutt PROTOTYP ── */

  function navigateTo(index, { push = true } = {}) {
    if (index === cameraIndex) return
    const journey = ++travelId
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dx = PAGES[index].x - PAGES[cameraIndex].x
    const dy = PAGES[index].y - PAGES[cameraIndex].y
    const distance = Math.abs(dx) + Math.abs(dy)

    /* Nav-etikettene står fast. Aktiv tekstfarge slippes ved avgang. */
    if (dx !== 0) header.dataset.travelDir = dx > 0 ? 'fwd' : 'back'
    navLinks().forEach((link) => link.removeAttribute('aria-current'))

    document.body.dataset.camera = String(index)
    document.body.classList.toggle('page-home', PAGES[index].path === '/')

    /* Lengre pan + overlapp med nedskaleringen: reisen skal LESES — kortene
       skal synlig gli forbi, ikke blinke. Panen starter idet nedskaleringen
       er godt i gang, så det kjennes som én sammenhengende bevegelse. */
    const panMs = reduced ? 0 : distance > 1 ? 800 : 600
    const scaleMs = reduced ? 0 : SCALE_MS
    const panDelay = Math.round(scaleMs * 0.55)

    // Sample every visible transform before canceling; cancel restores the CSS
    // destination, which is not necessarily where the camera/card is on screen.
    const from = mapCamera
      ? new DOMMatrix(getComputedStyle(mapCamera).transform).scale(mapRasterScale).toString()
      : new DOMMatrix(getComputedStyle(world).transform).toString()
    if (mapCamera) {
      mapCamera.getAnimations().forEach(animation => animation.cancel())
      mapCamera.replaceWith(world)
      mapCamera = null
    }
    world.style.zoom = ''
    mapRasterScale = 1
    const sectionTransforms = sections.map((section) => getComputedStyle(section).transform)
    if (document.body.classList.contains('world-map-intro')) {
      world.classList.remove('is-map')
      document.body.classList.remove('world-map-intro')
      document.body.dispatchEvent(new CustomEvent('world:map-intro-done'))
    }
    world.getAnimations().forEach((animation) => animation.cancel())
    sections.forEach((section) => section.getAnimations().forEach((animation) => animation.cancel()))
    setTransform(index)

    const arriving = sections[index]
    // Reset before revealing the destination; Work keeps the visitor's place.
    if (PAGES[index].path !== '/') arriving.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    cameraIndex = index
    if (titles[index]) document.title = titles[index]
    if (push) history.pushState({ world: index }, '', PAGES[index].path)
    syncAccessibility(index, { focus: true })

    if (panMs === 0) {
      world.classList.remove('is-travelling')
      header.classList.remove('nav-travelling')
      world.style.transformOrigin = ''
      sections.forEach((section) => {
        section.style.transform = ''
      })
      updateAriaCurrent(index)
      syncHeaderScrollState()
      syncVisibleMedia(world)
      return
    }

    world.classList.add('is-travelling')
    header.classList.add('nav-travelling')

    /* Alle sider står som 90 %-kort under reisen; avreisesiden animeres dit. */
    sections.forEach((section, slotIndex) => {
      section.style.transform = `scale(${TRAVEL_SCALE})`
      section.animate(
        [{ transform: sectionTransforms[slotIndex] }, { transform: `scale(${TRAVEL_SCALE})` }],
        { duration: scaleMs, easing: EASING },
      )
    })

    const pan = world.animate(
      [{ transform: from }, { transform: `translate3d(${-PAGES[index].x * 100}vw, calc(var(--viewport-height) * ${-PAGES[index].y}), 0)` }],
      { duration: panMs, delay: panDelay, easing: EASING, fill: 'backwards' },
    )

    const land = () => {
      if (journey !== travelId) return
      arriving.style.transform = ''
      const zoom = arriving.animate(
        [{ transform: `scale(${TRAVEL_SCALE})` }, { transform: 'scale(1)' }],
        { duration: scaleMs, easing: EASING },
      )
      /* Aktiv lenke fader til rødt først når reisen er helt ferdig. */
      const clearTravel = () => {
        if (journey !== travelId) return
        world.classList.remove('is-travelling')
        world.style.transformOrigin = ''
        header.classList.remove('nav-travelling')
        updateAriaCurrent(cameraIndex)
        syncVisibleMedia(world)
      }
      zoom.finished.then(clearTravel, clearTravel)
    }
    pan.finished.then(land, () => {})

    syncHeaderScrollState()
  }

  /* Nav-klikk = kamerabevegelse (samme side håndteres av jiggle-guarden i header.js). */
  header.addEventListener('click', (event) => {
    const link = event.target.closest('a')
    if (!isSameTabNavigation(event, link)) return
    const index = PAGES.findIndex((page) => page.path === new URL(link.href).pathname)
    if (index === -1 || index === cameraIndex) return
    event.preventDefault()
    navigateTo(index)
  })

  window.addEventListener('popstate', () => {
    const index = PAGES.findIndex((page) => page.path === location.pathname)
    if (index !== -1) navigateTo(index, { push: false })
  })

  /* Lenker INNE i verdenen som peker på en verdens-side (f.eks. «Archived
     work» i footerne) er kamerabevegelser — ikke harde navigasjoner. */
  world.addEventListener('click', (event) => {
    const link = event.target.closest('a')
    if (!isSameTabNavigation(event, link)) return
    const index = PAGES.findIndex((page) => page.path === link.pathname)
    if (index === -1) return
    event.preventDefault()
    if (index !== cameraIndex) navigateTo(index)
  })

  function showLoadState(index, status) {
    const column = slots[index]
    const hadFocus = column.contains(document.activeElement)
    const main = document.createElement('main')
    prepareMain(main, index)
    main.className = 'page-state world-page-state'
    main.append(createPageStateContent(status, () => loadPage(index)))
    column.replaceChildren(main)
    sections[index].dataset.loadState = status
    syncAccessibility(cameraIndex, { focus: hadFocus && index === cameraIndex })
  }

  // Fetch in parallel, but don't insert entire sibling pages while the camera
  // is animating. A selected destination always wins.
  async function waitForMount(index) {
    await new Promise(resolve => setTimeout(resolve, 0))
    while (index !== cameraIndex && ((document.body.classList.contains('world-map-intro') && performance.now() >= mapPreparationUntil) ||
      document.body.classList.contains('is-entering-home'))) {
      await new Promise(resolve => setTimeout(resolve, 80))
    }
  }

  function loadPage(index) {
    const state = loads[index]
    if (state.status === 'ready' || state.status === 'loading') return state.promise
    state.status = 'loading'
    showLoadState(index, 'loading')
    const controller = new AbortController()
    // A stalled request must eventually offer the same recovery as a rejection.
    const timeout = setTimeout(() => controller.abort(), 15000)
    state.promise = (async () => {
      try {
        const response = await fetch(PAGES[index].path, { signal: controller.signal })
        if (!response.ok) throw new Error(`Page request failed: ${response.status}`)
        const text = await response.text()
        await waitForMount(index)
        const doc = new DOMParser().parseFromString(text, 'text/html')
        const sourceMain = doc.querySelector('#site-layout main')
        if (!sourceMain) throw new Error('Page content is missing')
        const main = document.importNode(sourceMain, true)
        // Imported scripts are not page initializers; these modules mount below.
        main.querySelectorAll('script').forEach((script) => script.remove())
        prepareMain(main, index)
        const footer = doc.querySelector('#site-layout footer')
        const hadFocus = slots[index].contains(document.activeElement)
        slots[index].replaceChildren(main)
        if (footer) slots[index].append(document.importNode(footer, true))
        if (PAGES[index].path === '/') initTimeline(main.querySelector('[data-timeline]'))
        if (PAGES[index].path === '/archived-work/') initArchivedGrid(slots[index])
        titles[index] = doc.title || titles[index]
        state.status = 'ready'
        sections[index].dataset.loadState = 'ready'
        if (index === cameraIndex) document.title = titles[index]
        if (index === cameraIndex) syncAccessibility(cameraIndex, { focus: hadFocus })
        else syncVisibleMedia(slots[index])
      } catch {
        state.status = 'error'
        showLoadState(index, 'error')
      } finally {
        clearTimeout(timeout)
        state.promise = null
      }
    })()
    return state.promise
  }

  /* Monter søskensidene rundt den vi står på. */
  sections[selfIndex].dataset.loadState = 'ready'
  PAGES.forEach((_, index) => {
    if (index !== selfIndex) loadPage(index)
  })
}
