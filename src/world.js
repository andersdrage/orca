/* Verden: index, About og Praise ligger side om side i ETT dokument, og et
   kamera panorerer mellom dem — klikker du Praise fra forsiden, ser du faktisk
   About passere underveis. Ingen WebGL: ren DOM med transform på verdensstripen.

   Nav-lenkene (About/Praise) står fast oppe til høyre; aktiv side markeres med
   den røde understrekingen, som fader inn først når reisen er ferdig.

   Direktebesøk på /about/ eller /praise/ booter samme verden med kameraet
   stående på riktig side; søsknene hentes og monteres rundt. */

import { initTimeline } from './timeline.js'

/* Verdenskartet er 2D: About/Praise ligger mot øst, arkivet ligger UNDER
   forsiden — lenken bor i nedre venstre hjørne, og kameraet panorerer nedover
   for å nå det. Diagonale reiser (f.eks. About → arkiv) panorerer skrått. */
const PAGES = [
  { path: '/', x: 0, y: 0 },
  { path: '/about/', x: 1, y: 0 },
  { path: '/praise/', x: 2, y: 0 },
  { path: '/archive/', x: 0, y: 1 },
  { path: '/people/', x: 1, y: 1 },
]
const EASING = 'cubic-bezier(0.32, 0.08, 0.24, 1)'

export function initWorld(header) {
  const selfIndex = PAGES.findIndex((page) => page.path === location.pathname)
  if (selfIndex === -1 || !header) return

  const layout = document.getElementById('site-layout')
  const ownMain = layout?.querySelector('main')
  if (!layout || !ownMain) return

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

  const titles = PAGES.map((page) => (page.path === location.pathname ? document.title : null))
  let cameraIndex = selfIndex

  const setTransform = (index) => {
    const { x, y } = PAGES[index]
    world.style.transform = `translate3d(${-x * 100}vw, ${-y * 100}svh, 0)`
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
      event.preventDefault()
      const index = PAGES.findIndex((page) => page.path === new URL(link.href).pathname)
      if (index !== -1 && index !== cameraIndex) navigateTo(index)
    })
  })

  /* Frostet header-bakgrunn følger den aktive sidens interne scroll. */
  const sections = [...world.children]
  function syncHeaderScrollState() {
    /* Ingen frostet toppbar noe sted i verdenen — logo/nav svever fritt over innholdet. */
    header.classList.remove('is-scrolled')
  }
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
      if (/^\/(micromilspec|off-market|misc|uber|hjemla|hmkg|mountain-milk|humming-people|nettavisen|finn|brathwait)\/?$/.test(new URL(fromUrl).pathname)) return
    } catch {
      /* ugyldig referrer → kjør introen */
    }

    document.body.classList.add('world-map-intro')
    world.classList.add('is-travelling', 'is-map')
    sections.forEach((section) => {
      section.style.transform = `scale(${TRAVEL_SCALE})`
    })

    /* Kartet: hele 300vw × 200svh-stripen skalert inn i viewporten, sentrert. */
    const MAP_SCALE = 0.25
    world.style.transformOrigin = '0 0'
    world.style.transform = `translate3d(${(100 - 300 * MAP_SCALE) / 2}vw, ${(100 - 200 * MAP_SCALE) / 2}svh, 0) scale(${MAP_SCALE})`

    const HOLD_MS = 1000
    const ZOOM_MS = 1400
    setTimeout(() => {
      const from = getComputedStyle(world).transform
      world.classList.remove('is-map')
      const zoom = world.animate(
        [{ transform: from }, { transform: 'translate3d(0, 0, 0) scale(1)' }],
        { duration: ZOOM_MS, easing: EASING, fill: 'backwards' },
      )
      /* Kortet folder seg ut UNDERVEIS i flighten — samme varighet og kurve
         som zoomen, så hele ankomsten leses som én bevegelse. */
      const arriving = sections[cameraIndex]
      arriving.style.transform = ''
      const unfold = arriving.animate(
        [{ transform: `scale(${TRAVEL_SCALE})` }, { transform: 'scale(1)' }],
        { duration: ZOOM_MS, easing: EASING },
      )
      const land = () => {
        world.style.transformOrigin = ''
        setTransform(cameraIndex)
        world.classList.remove('is-travelling')
        document.body.classList.remove('world-map-intro')
        document.body.dispatchEvent(new CustomEvent('world:map-intro-done'))
      }
      Promise.all([zoom.finished, unfold.finished]).then(land, land)
    }, HOLD_MS)
  }
  playMapIntro()
  /* ── slutt PROTOTYP ── */

  function navigateTo(index, { push = true } = {}) {
    if (index === cameraIndex) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dx = PAGES[index].x - PAGES[cameraIndex].x
    const dy = PAGES[index].y - PAGES[cameraIndex].y
    const distance = Math.abs(dx) + Math.abs(dy)

    /* Nav-etikettene står fast oppe til høyre — ingen FLIP-flytting lenger.
       Understrekingen fjernes FØRST: aria-current slippes ved avgang, og
       streken trekkes ut i reiseretningen (data-travel-dir styrer origin). */
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

    /* Retarget-vennlig: kanseller pågående animasjoner, les nåværende posisjon. */
    world.getAnimations().forEach((animation) => animation.cancel())
    sections.forEach((section) => section.getAnimations().forEach((animation) => animation.cancel()))
    const from = getComputedStyle(world).transform
    setTransform(index)

    const departing = sections[cameraIndex]
    const arriving = sections[index]
    cameraIndex = index
    if (titles[index]) document.title = titles[index]
    if (push) history.pushState({ world: index }, '', PAGES[index].path)

    if (panMs === 0) {
      sections.forEach((section) => {
        section.style.transform = ''
      })
      updateAriaCurrent(index)
      syncHeaderScrollState()
      return
    }

    world.classList.add('is-travelling')
    header.classList.add('nav-travelling')

    /* Alle sider står som 90 %-kort under reisen; avreisesiden animeres dit. */
    sections.forEach((section) => {
      section.style.transform = `scale(${TRAVEL_SCALE})`
    })
    departing.animate(
      [{ transform: 'scale(1)' }, { transform: `scale(${TRAVEL_SCALE})` }],
      { duration: scaleMs, easing: EASING },
    )

    const pan = world.animate(
      [{ transform: from }, { transform: `translate3d(${-PAGES[index].x * 100}vw, ${-PAGES[index].y * 100}svh, 0)` }],
      { duration: panMs, delay: panDelay, easing: EASING, fill: 'backwards' },
    )

    const land = () => {
      arriving.style.transform = ''
      const zoom = arriving.animate(
        [{ transform: `scale(${TRAVEL_SCALE})` }, { transform: 'scale(1)' }],
        { duration: scaleMs, easing: EASING },
      )
      /* Den røde understrekingen på aktiv lenke fader inn FØRST når reisen er
         helt ferdig (CSS-transition på text-decoration-color). */
      const clearTravel = () => {
        world.classList.remove('is-travelling')
        header.classList.remove('nav-travelling')
        updateAriaCurrent(cameraIndex)
      }
      zoom.finished.then(clearTravel, clearTravel)
    }
    pan.finished.then(land, () => {})

    syncHeaderScrollState()
  }

  /* Nav-klikk = kamerabevegelse (samme side håndteres av jiggle-guarden i header.js). */
  header.addEventListener('click', (event) => {
    const link = event.target.closest('a')
    if (!link) return
    const index = PAGES.findIndex((page) => page.path === new URL(link.href).pathname)
    if (index === -1 || index === cameraIndex) return
    event.preventDefault()
    navigateTo(index)
  })

  window.addEventListener('popstate', () => {
    const index = PAGES.findIndex((page) => page.path === location.pathname)
    if (index !== -1) navigateTo(index, { push: false })
  })

  /* Monter søskensidene rundt den vi står på. */
  PAGES.forEach((page, index) => {
    if (index === selfIndex) return
    fetch(page.path)
      .then((response) => response.text())
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html')
        titles[index] = doc.title
        const main = doc.querySelector('#site-layout main')
        const footer = doc.querySelector('#site-layout footer')
        if (main) slots[index].append(document.importNode(main, true))
        if (footer) slots[index].append(document.importNode(footer, true))
        /* Forsiden trenger tidslinje-motoren sin når den er hentet inn. */
        if (page.path === '/') initTimeline()
      })
      .catch(() => {})
  })
}
