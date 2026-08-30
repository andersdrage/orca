/* Verden: index, About og Praise ligger side om side i ETT dokument, og et
   kamera panorerer mellom dem — klikker du Praise fra forsiden, ser du faktisk
   About passere underveis. Ingen WebGL: ren DOM med transform på verdensstripen.

   Nav-lenkene er romlige indikatorer: sider til høyre for kameraet har lenken
   sin til høyre, passerte/aktive sider dokker til venstre ved logoen. Layouten
   styres av body[data-camera]; FLIP-animasjoner flytter lenkene i samme retning,
   varighet og kurve som kameraet.

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
  /* Fixed-posisjonerte elementer kan ikke bo inne i verdensstripen: dens
     will-change/transform gjør den til containing block, og «fixed» løses da
     mot 300vw-stripen i stedet for viewporten (scroll-hinten havnet på side 3). */
  const hint = ownMain.querySelector('[data-scroll-hint]')
  if (hint) document.body.append(hint)
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
    header.classList.toggle('is-scrolled', sections[cameraIndex].scrollTop > 8)
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

  function navigateTo(index, { push = true } = {}) {
    if (index === cameraIndex) return
    /* Enhver verdensreise betyr at navigasjonen er oppdaget — scroll-hinten
       (pilene nede til høyre) skal ikke blinke videre på andre sider. */
    document.querySelector('[data-scroll-hint]')?.classList.add('is-hidden')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dx = PAGES[index].x - PAGES[cameraIndex].x
    const dy = PAGES[index].y - PAGES[cameraIndex].y
    const distance = Math.abs(dx) + Math.abs(dy)

    /* FLIP: mål lenkene før/etter layoutbyttet, animer i takt med kameraet.
       NB: lenkene har en statisk translateY(2px) i CSS — den må inn i keyframene,
       ellers hopper etiketten 2px opp ved avgang og ned ved ankomst. */
    const links = navLinks()

    /* Understrekingen fjernes FØRST: aria-current slippes ved avgang, og
       streken trekkes ut i reiseretningen (data-travel-dir styrer origin). */
    /* Ren vertikal reise (arkivet) flytter ingen nav-etiketter — behold forrige dir. */
    if (dx !== 0) header.dataset.travelDir = dx > 0 ? 'fwd' : 'back'
    links.forEach((link) => link.removeAttribute('aria-current'))

    const before = links.map((link) => link.getBoundingClientRect().left)
    document.body.dataset.camera = String(index)
    document.body.classList.toggle('page-home', PAGES[index].path === '/')
    const after = links.map((link) => link.getBoundingClientRect().left)

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

    links.forEach((link, i) => {
      const dx = before[i] - after[i]
      if (Math.abs(dx) > 1) {
        link.getAnimations().forEach((animation) => animation.cancel())
        const base = getComputedStyle(link).transform
        const baseSuffix = base === 'none' ? '' : ` ${base}`
        link.animate(
          [{ transform: `translateX(${dx}px)${baseSuffix}` }, { transform: base === 'none' ? 'none' : base }],
          { duration: panMs, delay: panDelay, easing: EASING, fill: 'backwards' },
        )
      }
    })

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
