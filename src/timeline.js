/* Horisontal, loopende tidslinje på forsiden.
   Tre identiske kopier av tilene rendres; scroll holdes alltid i midt-kopien
   (wrap ved 0.5/1.5 × kopibredde) så loopen aldri møter en kant. */

import { micromilspecCovers } from './portfolio-data.js'
import { isSameTabNavigation } from './link-navigation.js'
import { sessionState } from './session-state.js'
import { FEATURED_ORDER, isCasePath } from './case-navigation.js'
import { thumbnailAppearance, sameSizeThumbnails, THUMBNAIL_CHANGE } from './thumbnail-settings.js'

const TILES = [
  {
    id: 'houeland',
    title: 'Houeland',
    href: '/houeland/',
    image: '/images/new-covers/cover-ratio-houeland.webp',
    color: '#e3d9c5',
    ratio: '13 / 10',
    h: '43svh',
  },
  {
    id: 'micromilspec',
    title: 'MICROMILSPEC',
    href: '/micromilspec/',
    /* Hovedcover = hvit/oransje (micromilspecCovers[0]) — tile og case-hero viser
       identisk utsnitt, så morphen er én og samme flate uten dobbelteksponering. */
    image: '/images/micromilspec-cover-white.jpg',
    color: '#e8862b',
    ratio: '1331 / 2000',
    h: '56svh',
  },
  {
    id: 'hjemla',
    title: 'Hjemla',
    href: '/hjemla/',
    image: '/images/hjemla-1-full.jpg',
    color: '#f5c542',
    /* Samme aspekt som bildet (2400×1600) — identisk utsnitt i tile og hero. */
    ratio: '3 / 2',
    h: '43svh',
  },
  {
    id: 'off-market',
    title: 'Off Market',
    href: '/off-market/',
    image: '/images/offmarket-cover-1.jpg',
    color: '#a67c52',
    /* Samme aspekt som coveret (1299×1003) — identisk utsnitt i tile og hero. */
    ratio: '1299 / 1003',
    h: '51svh',
  },
  {
    id: 'boligmappa',
    title: 'Boligmappa',
    href: '/boligmappa/',
    /* Cover-duellens vinner: de to svevende telefonene. */
    image: '/images/boligmappa-cover-2.jpg',
    color: '#e8511f',
    /* Samme aspekt som coveret (1600×2494). */
    ratio: '1600 / 2494',
    h: '51svh',
  },
  {
    id: 'nettavisen',
    title: 'Nettavisen',
    href: '/nettavisen/',
    image: '/images/nettavisen-cover.jpg',
    color: '#31406f',
    /* Samme aspekt som coveret (1147×1190). */
    ratio: '1147 / 1190',
    h: '48svh',
  },
  {
    id: 'finn',
    title: 'FINN.no',
    href: '/finn/',
    image: '/images/finn-5.jpg',
    color: '#c9a227',
    /* Samme aspekt som bildet (1920×1080). */
    ratio: '16 / 9',
    h: '38svh',
  },
  {
    id: 'uber',
    title: 'Uber',
    href: '/uber/',
    image: '/images/uber-cover-1.jpg',
    color: '#c99b6a',
    /* Samme aspekt som coveret (1376×1139) — identisk utsnitt i tile og hero. */
    ratio: '1376 / 1139',
    h: '38svh',
  },

].sort((a, b) => FEATURED_ORDER.indexOf(a.id) - FEATURED_ORDER.indexOf(b.id))

function tileHtml(tile) {
  tile = thumbnailAppearance(tile)
  const style = `--tile-bg: ${tile.color}; --tile-ratio: ${tile.ratio}; --tile-h: ${tile.h}`
  // Image tiles use their cover instead of a colored placeholder.
  const title = tile.title && !tile.image ? `<span class="timeline-tile__title">${tile.title}</span>` : ''
  // Decode covers before they scroll into view.
  const image = tile.image
    ? `<img class="timeline-tile__image" src="${tile.image}" alt="" loading="eager" fetchpriority="high" decoding="async" />`
    : ''
  const classes = `timeline-tile${tile.image ? ' timeline-tile--image' : ''}`
  /* Hover: prosjektnavnet skyves ut fra bildets underkant med fjær-easing. */
  const hoverLabel =
    tile.href && tile.title && tile.image
      ? `<span class="timeline-tile__hover-label" aria-hidden="true">${tile.title}</span>`
      : ''
  return tile.href
    ? `<a class="${classes}" href="${tile.href}" aria-label="${tile.title}" data-tile-id="${tile.id}" style="${style}">${image}${hoverLabel}${title}</a>`
    : `<div class="${classes}" style="${style}" aria-hidden="true">${image}</div>`
}

/* The world passes its mounted homepage scroller on sibling entry. */
export function initTimeline(scrollerEl) {
  const scroller = scrollerEl ?? document.querySelector('[data-timeline]')
  if (!scroller) return

  const tiles = TILES.map(tile => ({ ...tile }))

  // Restore the selected MICROMILSPEC cover when the index mounts again.
  try {
    let coverIndex = Number(sessionState.getItem('micromilspec:cover')) || 0
    if (!micromilspecCovers[coverIndex]) coverIndex = 0
    const micromilspecTile = tiles.find((tile) => tile.id === 'micromilspec')
    micromilspecTile.image = `/images/${micromilspecCovers[coverIndex].file}`
    micromilspecTile.ratio = micromilspecCovers[coverIndex].ratio
  } catch {
    /* sessionStorage utilgjengelig → standard-cover */
  }

  const copies = [0, 1, 2].map((copyIndex) => {
    const copy = document.createElement('div')
    copy.className = 'timeline-copy'
    copy.dataset.copy = String(copyIndex)
    copy.innerHTML = tiles.map(tileHtml).join('')
    /* Kun midt-kopien er "ekte" for skjermleser/tastatur — duplikatene er visuell loop-fyll. */
    if (copyIndex !== 1) {
      copy.setAttribute('aria-hidden', 'true')
      copy.querySelectorAll('a').forEach((link) => {
        link.tabIndex = -1
      })
    }
    scroller.append(copy)
    return copy
  })

  // Decode each unique cover during the opening hold, before it is animated.
  // Copies share the same resource; don't request three separate decodes.
  copies[1].querySelectorAll('img').forEach(image => image.decode().catch(() => {}))

  let copyWidth = copies[1].offsetLeft - copies[0].offsetLeft
  /* Den visuelle (myke) scrollposisjonen — jager scrollLeft i elasticFrame. */
  let elasticCurrent = 0

  /* Intro-tekst til venstre for første prosjekt — KUN første gjennomgang.
     Absolutt posisjonert i innholdskoordinater (utenfor kopi-flexen, så
     loop-målingene ikke påvirkes). Når man har scrollet forbi, fjernes den
     permanent mens den er utenfor skjermen — loopen kommer rundt uten den. */
  const INTRO_TEXT =
    'I’m Anders Drage, a multidisciplinary designer from the fjords of Norway. I design identities, interfaces, and the connections between them.'
  const intro = document.createElement('p')
  intro.className = 'timeline-intro'
  const emailLink = document.createElement('a')
  emailLink.href = 'mailto:anders@dra.ge'
  emailLink.textContent = 'Email me'
  intro.append(document.createTextNode(`${INTRO_TEXT} `), emailLink)
  scroller.append(intro)
  const firstTileEl = copies[1].querySelector('.timeline-tile')
  let introContentLeft = 0
  let introContentRight = 0
  let introPlaced = false
  let introDismissed = false
  /* Ekte brukerinput — wrap-teleporter og layout-shifts teller ikke. */
  let userInteracted = false
  const markInteraction = () => {
    userInteracted = true
  }
  scroller.addEventListener('wheel', markInteraction, { once: true, passive: true })
  scroller.addEventListener('pointerdown', markInteraction, { once: true, passive: true })
  scroller.addEventListener('keydown', markInteraction, { once: true })

  function placeIntro() {
    const width = intro.offsetWidth
    if (!width || !window.innerWidth) return false
    /* offsetLeft = layout-koordinater relativt til scrolleren — immun mot både
       elastikk-transforms og kart-introens nedskalering av hele verdenen
       (getBoundingClientRect ville målt 4× feil mens kartet står på 0.25). */
    const firstTileContentLeft = firstTileEl.offsetLeft
    if (!firstTileContentLeft) return false
    // Reserve the image's maximum overhang: 20% centre magnification plus 3% hover.
    const imageOverhang = firstTileEl.offsetWidth * (1.2 * 1.03 - 1) / 2
    introContentLeft = firstTileContentLeft - width - imageOverhang - 56
    introContentRight = introContentLeft + width
    intro.style.left = `${introContentLeft}px`
    introPlaced = true
    return true
  }
  placeIntro()

  /* Fjern introen når den er scrollet helt ut til venstre (aldri synlig fjerning).
     Gjemmes ikke før posisjonen faktisk er målt med gyldige dimensjoner —
     init i en dimensjonløs (bakgrunnet) fane skal ikke feil-gjemme den. */
  scroller.addEventListener(
    'scroll',
    () => {
      if (introDismissed || !introPlaced) return
      /* Ved intro-entré: gjem kun etter ekte input — frossen-init/wrap-hopp
         skal ikke feil-gjemme den. (Case-retur står forbi introen med vilje.) */
      if (useIntroEntry && !userInteracted) return
      if (scroller.scrollLeft > introContentRight + 120) {
        intro.hidden = true
        introDismissed = true
      }
    },
    { passive: true },
  )

  /* Høyre viewport-kant er den eneste kanten publikum ser bevege seg: i pan-overgangen
     til About/Praise glir forsidens snapshot sidelengs, og avstanden fra en tile til
     snapshotets bakkant er konstant — så kuttet man ser midt på skjermen ER kuttet som
     lå ved høyre kant da man slapp scrollen. Derfor: la aldri kanten bli stående midt
     i en tile. Etter hver scroll settes den i nærmeste mellomrom (minste bevegelse:
     enten avslør tilen helt, eller skyv den helt ut). */
  const MAX_EDGE_GAP = 28

  function settleEdge(behavior = 'smooth') {
    const edgeX = scroller.getBoundingClientRect().right
    const tiles = [...scroller.querySelectorAll('.timeline-tile')]
    const index = tiles.findIndex((tile) => {
      const rect = tile.getBoundingClientRect()
      return rect.left < edgeX - 1 && rect.right > edgeX + 1
    })
    if (index === -1) return

    const rect = tiles[index].getBoundingClientRect()
    const prev = tiles[index - 1]?.getBoundingClientRect()
    const next = tiles[index + 1]?.getBoundingClientRect()
    /* Sømgapet er flere hundre piksler — kanten skal ligge like utenfor tilen, ikke midt i tomrommet. */
    const gapAfter = next ? Math.min((next.left - rect.right) / 2, MAX_EDGE_GAP) : MAX_EDGE_GAP
    const gapBefore = prev ? Math.min((rect.left - prev.right) / 2, MAX_EDGE_GAP) : MAX_EDGE_GAP

    const forward = rect.right + gapAfter - edgeX
    const back = rect.left - gapBefore - edgeX
    const delta = Math.abs(forward) <= Math.abs(back) ? forward : back
    if (Math.abs(delta) < 1) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    scroller.scrollTo({ left: scroller.scrollLeft + delta, behavior: reduced ? 'instant' : behavior })
  }

  function wrap() {
    if (!copyWidth) return
    const x = scroller.scrollLeft
    /* Teleporten må også flytte den visuelle (elastiske) posisjonen — ellers
       leser fjæren hoppet som en gigantisk hastighet og strekker seg vilt. */
    if (x < copyWidth * 0.5) {
      scroller.scrollLeft = x + copyWidth
      elasticCurrent += copyWidth
    } else if (x > copyWidth * 1.5) {
      scroller.scrollLeft = x - copyWidth
      elasticCurrent -= copyWidth
    }
  }

  /* Start ved midt-kopien med ~360px luft til venstre for første tile. Sømgapet
     (kopienes padding-right) er større enn inset-en, så forrige loop-runde ligger
     helt utenfor skjermen ved inngang — den avsløres først når man scroller bakover. */
  const edgeInset = Math.min(360, Math.round(window.innerWidth * 0.4))
  /* Entré: introteksten står 30px fra venstre kant, første prosjekt følger etter.
     Faller tilbake til standard-inset hvis dimensjoner manglet ved init —
     retry-loopen under korrigerer posisjonen når fanen får ekte størrelse. */
  /* Intro-entré: luft fra venstre viewportkant til tekstblokka (ornamentet
     henger 34px lenger ut og får dermed ~50px). */
  const introEdgeGap = () => parseFloat(getComputedStyle(scroller).getPropertyValue('--intro-edge-gap')) || 84
  let initialScroll = introPlaced ? introContentLeft - introEdgeGap() : copyWidth - edgeInset
  let useIntroEntry = introPlaced
  let returningToCase = false

  /* Lukker man et prosjekt og forsiden lastes på nytt (uten bfcache), skal
     tidslinjen stå ved prosjektet man kom fra — ikke kastes tilbake til start.
     (Med bfcache bevares posisjonen naturlig; denne koden kjører da ikke.) */
  try {
    const fromUrl = window.navigation?.activation?.from?.url ?? document.referrer
    if (isCasePath(new URL(fromUrl).pathname)) {
      const id = sessionState.getItem('timeline:last-case')
      const tile = id ? copies[1].querySelector(`[data-tile-id="${CSS.escape(id)}"]`) : null
      if (tile) {
        /* offsetLeft: layout-koordinater — upåvirket av transforms (se placeIntro). */
        const saved = JSON.parse(sessionState.getItem('timeline:return-position') || 'null')
        const center = saved?.id === id && Number.isFinite(saved.center)
          ? saved.center * innerWidth : edgeInset + tile.offsetWidth / 2
        initialScroll = tile.offsetLeft + tile.offsetWidth / 2 - center
        // Normalize into the loop range before the first paint on return.
        while (initialScroll > copyWidth * 1.4) initialScroll -= copyWidth
        while (initialScroll < copyWidth * 0.6) initialScroll += copyWidth
        useIntroEntry = false
        returningToCase = true
      }
    }
  } catch {
    /* ugyldig referrer → standard startposisjon */
  }

  scroller.scrollLeft = initialScroll
  elasticCurrent = scroller.scrollLeft
  /* Kant-snappingen skal ikke overstyre den designede intro-entréen. */
  // A wide mobile thumbnail may cross both edges. Snapping it on return would
  // replace the clicked project with its neighbour before the first frame.
  if (!useIntroEntry && !returningToCase) settleEdge('instant')

  /* Entré-koreografi (à la benji.org): introteksten stiger inn linje for linje,
     så tilene i stigende rekkefølge, til slutt chromen (logo → nav → hjørner).
     Ren CSS-animasjon gatet på body-klassen; her splittes bare introen i
     ord-spans gruppert per rendret linje (--line styrer delayen). Kjøres KUN
     ved frisk last av forsiden — ikke ved case-retur (useIntroEntry er false),
     ikke når indexen er verdens-montert fra en annen side (page-home mangler),
     og ikke ved redusert bevegelse. Alt skjer synkront før første paint. */
  if (
    useIntroEntry &&
    document.body.classList.contains('page-home') &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    intro.textContent = ''
    const wordSpans = []
    const appendWords = (text, parent = intro) => {
      text.split(' ').forEach((word) => {
        const span = document.createElement('span')
        span.className = 'timeline-intro__word'
        span.textContent = word
        parent.append(span, document.createTextNode(' '))
        wordSpans.push(span)
      })
    }
    appendWords(INTRO_TEXT)
    emailLink.textContent = ''
    intro.append(emailLink)
    appendWords('Email me', emailLink)
    let lineIndex = -1
    let lastTop = null
    wordSpans.forEach((span) => {
      /* I en dimensjonløs (bakgrunnet) fane er alle offsetTop 0 — da degraderer
         hele avsnittet til én samlet linje, som er helt greit. */
      if (span.offsetTop !== lastTop) {
        lineIndex += 1
        lastTop = span.offsetTop
      }
      span.style.setProperty('--line', String(lineIndex))
    })
    const startEntrance = () => {
      document.body.classList.add('is-entering-home')
      const endEntrance = () => document.body.classList.remove('is-entering-home')
      // Finish the home entrance before leaving, including cached navigation.
      setTimeout(endEntrance, 2600)
      window.addEventListener('pageswap', endEntrance, { once: true })
    }
    /* PROTOTYP kart-intro (world.js): entréen venter til zoomen har landet. */
    if (document.body.classList.contains('world-map-intro')) {
      document.body.addEventListener('world:map-intro-done', startEntrance, { once: true })
    } else {
      startEntrance()
    }
  }
  scroller.addEventListener('scroll', wrap, { passive: true })

  /* Selvkalibrerende entré: layouten kan flytte seg de første framene (fonter,
     bilder, bakgrunnet fane som får dimensjoner). Re-mål intro-posisjonen en
     kort periode og korriger entré-scrollen — men aldri etter at brukeren har
     begynt å scrolle selv. */
  if (useIntroEntry || !introPlaced) {
    let stableFrames = 0
    const calibrate = () => {
      if (introDismissed || userInteracted || stableFrames > 30) return
      if (placeIntro()) {
        const target = introContentLeft - introEdgeGap()
        if (Math.abs(target - scroller.scrollLeft) > 2) {
          scroller.scrollLeft = target
          elasticCurrent = target
          stableFrames = 0
        } else {
          stableFrames += 1
        }
      }
      requestAnimationFrame(calibrate)
    }
    requestAnimationFrame(calibrate)
  }

  /* NB: ingen auto-snap på scrollend — å flytte lista på egen hånd mellom
     hjul-bursts sloss med brukerens input. Kanten rettes kun når det trengs:
     ved last og resize. Navigasjon bevarer posisjonen brukeren forlot. */

  let layoutViewportWidth = innerWidth
  const refreshLayout = () => {
    // Use the previous geometry to preserve the visible project through a
    // toolbar resize or rotation, rather than snapping to a different case.
    const anchor = tileGeometry.map(entry => ({
      tile: entry.tile,
      center: entry.contentLeft + entry.width / 2 - scroller.scrollLeft,
    })).sort((a, b) => Math.abs(a.center - layoutViewportWidth / 2) - Math.abs(b.center - layoutViewportWidth / 2))[0]
    clearElasticTransforms()
    copyWidth = copies[1].offsetLeft - copies[0].offsetLeft
    if (!introDismissed) placeIntro()
    if (useIntroEntry && !userInteracted && !introDismissed) {
      scroller.scrollLeft = introContentLeft - introEdgeGap()
    } else if (anchor) {
      scroller.scrollLeft = anchor.tile.offsetLeft + anchor.tile.offsetWidth / 2 - anchor.center / layoutViewportWidth * innerWidth
    }
    layoutViewportWidth = innerWidth
    elasticCurrent = scroller.scrollLeft
    measureTiles()
  }
  window.addEventListener('resize', refreshLayout)
  document.body.addEventListener('world:map-intro-done', refreshLayout)

  /* B sykler MICROMILSPEC-coveret — kun her på forsiden. Bytter bilde og ratio
     på tilen i alle tre kopiene, lagrer valget (case-heroen følger etter ved
     åpning) og re-måler loop-geometrien siden tilebredden endres. Variantene
     lastes ved valg. */
  let coverIndex = 0
  try {
    coverIndex = Number(sessionState.getItem('micromilspec:cover')) || 0
    if (!micromilspecCovers[coverIndex]) coverIndex = 0
  } catch {
    coverIndex = 0
  }
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'b' && event.key !== 'B') return
    if (event.metaKey || event.ctrlKey || event.altKey) return
    /* Kun når forsiden faktisk vises (ikke fra About/Praise i verdenen),
       og kun der micromilspec-tilen finnes (ikke på arkiv-sida). */
    if (!document.body.classList.contains('page-home')) return
    if (sameSizeThumbnails()) return
    if (!scroller.querySelector('[data-tile-id="micromilspec"]')) return
    coverIndex = (coverIndex + 1) % micromilspecCovers.length
    try {
      sessionState.setItem('micromilspec:cover', String(coverIndex))
    } catch {
      /* valget gjelder da bare til neste last */
    }
    const cover = micromilspecCovers[coverIndex]
    Object.assign(tiles.find(tile => tile.id === 'micromilspec'), { image: `/images/${cover.file}`, ratio: cover.ratio })
    scroller.querySelectorAll('[data-tile-id="micromilspec"]').forEach((tile) => {
      tile.style.setProperty('--tile-ratio', cover.ratio)
      const image = tile.querySelector('.timeline-tile__image')
      if (image) image.src = `/images/${cover.file}`
    })
    const progress = copyWidth ? scroller.scrollLeft / copyWidth : 1
    copyWidth = copies[1].offsetLeft - copies[0].offsetLeft
    scroller.scrollLeft = progress * copyWidth
    elasticCurrent = scroller.scrollLeft
    measureTiles()
    /* Tilebredden endret seg — introteksten må re-ankres til første tile. */
    if (!introDismissed) placeIntro()
  })

  /* Alt hjul-input (vertikalt hjul OG trackpad/Magic Mouse-deltaX) kapres og
     skrives til scrollLeft på main thread — da lander native scroll og de
     elastiske transformene i samme frame, uten compositor-shimmer. */
  scroller.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey) return /* pinch-zoom skal fortsatt fungere */
      event.preventDefault()
      const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX
      const scale = event.deltaMode === 1 ? 32 : event.deltaMode === 2 ? scroller.clientWidth : 1
      scroller.scrollLeft += delta * scale
    },
    { passive: false },
  )

  /* Elastisk scroll (2+3): den synlige posisjonen `elasticCurrent` jager
     scrollLeft med eksponentiell lerp — spenningen (target − current) er
     «fjærstrekket». Kopiene kompenserer native scroll til den myke posisjonen,
     og hver tile får ekstra lag som vokser mot høyre viewport-kant, så raden
     strekker seg under fart og samler seg igjen i ro. Ingen CSS-transitions
     involvert — rene per-frame transform-skriv. */
  const LERP = 0.14
  const LAG_MIN = 0.04
  const LAG_MAX = 0.18
  const MAX_TENSION = 600
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotionQuery.addEventListener('change', () => {
    if (reducedMotionQuery.matches) scroller.scrollTo({ left: scroller.scrollLeft, behavior: 'instant' })
  })
  const finePointer = window.matchMedia('(pointer: fine)')

  let tileGeometry = []
  let showFirstArrivalName = useIntroEntry
  let firstNameAnchor = null
  let elasticFrameId = 0
  let lastFrameTime = performance.now()
  const scheduleElastic = () => {
    if (!elasticFrameId && !document.hidden) {
      lastFrameTime = performance.now()
      elasticFrameId = requestAnimationFrame(elasticFrame)
    }
  }
  function measureTiles() {
    /* offsetLeft/offsetWidth: layout-koordinater — upåvirket av elastikk-
       transforms og kart-introens verdens-skalering (se placeIntro). */
    tileGeometry = [...scroller.querySelectorAll('.timeline-tile')].map((tile) => ({
      tile,
      contentLeft: tile.offsetLeft,
      width: tile.offsetWidth,
      labelRevealed: tile.classList.contains('is-label-revealed'),
      // Only the final thumbnail fades as the next loop comes into view.
      fades: !tile.nextElementSibling,
      dirty: false,
      fadeDirty: false,
    }))
    scheduleElastic()
  }
  measureTiles()

  // Scale around the visible centre without changing layout widths or loop seams.
  // A cosine falloff gives neighbouring tiles a gradual handoff, with no winner snap.
  function updateMagnification() {
    const viewportWidth = window.innerWidth
    const radius = viewportWidth * 0.65
    const tension = finePointer.matches ? scroller.scrollLeft - elasticCurrent : 0
    tileGeometry.forEach(entry => {
      if (entry.tile.classList.contains('is-navigating')) return
      const xNorm = (entry.contentLeft - elasticCurrent) / viewportWidth
      const lag = LAG_MIN + (LAG_MAX - LAG_MIN) * Math.min(Math.max(xNorm, 0), 1)
      const center = entry.contentLeft + entry.width / 2 - elasticCurrent + tension * lag
      const distance = Math.min(Math.abs(center - viewportWidth / 2) / radius, 1)
      // The first name starts visible beside the introduction, then moves from
      // that position as soon as scrolling begins, without waiting for centre.
      if (entry.tile === firstTileEl && showFirstArrivalName) {
        if (firstNameAnchor === null || !userInteracted) firstNameAnchor = center
        if (userInteracted && center < -entry.width / 2) showFirstArrivalName = false
      }
      const firstArrival = entry.tile === firstTileEl && showFirstArrivalName
      const anchor = firstArrival ? firstNameAnchor : viewportWidth / 2
      // Start the name's continuous downward travel with thumbnail growth,
      // rather than keeping it behind the image until it is almost centred.
      const position = Math.max(-1, Math.min(1, (anchor - center) / radius))
      const travel = reducedMotionQuery.matches ? 0 : position
      // Keep the existing departure fade distance despite the earlier reveal.
      const opacity = reducedMotionQuery.matches
        ? Number(Math.abs(anchor - center) / radius < .45) : 1 - Math.min(1, Math.max(0, position / .6))
      const revealLabel = position > -1 && opacity > 0
      const labelProgress = `${travel.toFixed(4)},${opacity.toFixed(4)}`
      if (entry.labelProgress !== labelProgress) {
        entry.tile.style.setProperty('--tile-label-travel', travel.toFixed(4))
        entry.tile.style.setProperty('--tile-label-opacity', opacity.toFixed(4))
        entry.labelProgress = labelProgress
      }
      if (entry.labelRevealed !== revealLabel) {
        entry.tile.classList.toggle('is-label-revealed', revealLabel)
        entry.labelRevealed = revealLabel
      }
      const scale = reducedMotionQuery.matches ? '1' : (1 + 0.1 * (1 + Math.cos(distance * Math.PI))).toFixed(4)
      if (entry.magnification !== scale) {
        entry.tile.style.setProperty('--tile-magnification', scale)
        entry.magnification = scale
      }
    })
  }
  updateMagnification()

  /* Sømfokus: når siste prosjekt nærmer seg venstre kant (= ny runde starter til
     høyre for det), fader det ut og overlater oppmerksomheten til restarten. */
  function updateSeamFade() {
    updateMagnification()
    const viewportWidth = window.innerWidth
    tileGeometry.forEach((entry) => {
      if (!entry.fades) return
      const centerNorm = (entry.contentLeft + entry.width / 2 - elasticCurrent) / viewportWidth
      let opacity = (centerNorm - 0.08) / 0.34
      opacity = Math.min(Math.max(opacity, 0.05), 1)
      if (opacity >= 0.999) {
        if (entry.fadeDirty) {
          entry.tile.style.opacity = ''
          entry.fadeDirty = false
        }
      } else {
        entry.tile.style.opacity = opacity.toFixed(3)
        entry.fadeDirty = true
      }
    })
  }

  let elasticActive = false
  let tilePressed = false

  function clearElasticTransforms() {
    intro.style.translate = ''
    copies.forEach((copy) => {
      copy.style.transform = ''
    })
    tileGeometry.forEach((entry) => {
      if (entry.dirty) {
        entry.tile.style.transform = ''
        entry.dirty = false
      }
    })
  }

  function elasticFrame(now) {
    elasticFrameId = 0
    const dt = Math.min((now - lastFrameTime) / 16.667, 3)
    lastFrameTime = now
    // Keep the hit target still between pointerdown and click. Otherwise the
    // scroll spring can move a tile out from under a quick press.
    if (tilePressed) return

    if (reducedMotionQuery.matches || !finePointer.matches) {
      elasticCurrent = scroller.scrollLeft
      if (elasticActive) {
        clearElasticTransforms()
        elasticActive = false
      }
      updateSeamFade()
      return
    }

    const target = scroller.scrollLeft
    const ease = 1 - Math.pow(1 - LERP, dt)
    elasticCurrent += (target - elasticCurrent) * ease

    let tension = target - elasticCurrent
    if (Math.abs(tension) > MAX_TENSION) {
      tension = Math.sign(tension) * MAX_TENSION
      elasticCurrent = target - tension
    }

    if (Math.abs(tension) < 0.3) {
      if (elasticActive) {
        elasticCurrent = target
        clearElasticTransforms()
        elasticActive = false
      }
      updateSeamFade()
      return
    }

    updateSeamFade()

    elasticActive = true
    copies.forEach((copy) => {
      copy.style.transform = `translate3d(${tension}px, 0, 0)`
    })
    // The intro and first image must follow the same spring during reversals.
    if (!introDismissed) intro.style.translate = `${tension}px 0`

    const viewportWidth = window.innerWidth
    tileGeometry.forEach((entry) => {
      const xNorm = (entry.contentLeft - elasticCurrent) / viewportWidth
      if (xNorm < -0.4 || xNorm > 1.4) {
        if (entry.dirty) {
          entry.tile.style.transform = ''
          entry.dirty = false
        }
        return
      }
      const lag = LAG_MIN + (LAG_MAX - LAG_MIN) * Math.min(Math.max(xNorm, 0), 1)
      entry.tile.style.transform = `translate3d(${(tension * lag).toFixed(2)}px, 0, 0)`
      if (entry.tile === firstTileEl && !introDismissed) {
        intro.style.translate = `${(tension * (1 + lag)).toFixed(2)}px 0`
      }
      entry.dirty = true
    })
    scheduleElastic()
  }
  scroller.addEventListener('scroll', scheduleElastic, { passive: true })
  window.addEventListener('pageshow', scheduleElastic)
  document.addEventListener('visibilitychange', scheduleElastic)
  reducedMotionQuery.addEventListener('change', scheduleElastic)
  finePointer.addEventListener('change', scheduleElastic)

  let uniformApplied = sameSizeThumbnails()
  const updateThumbnails = () => {
    if (uniformApplied === sameSizeThumbnails()) return
    uniformApplied = sameSizeThumbnails()
    clearElasticTransforms()
    const anchors = [...scroller.querySelectorAll('.timeline-tile')].map(tile => ({
      tile, center: tile.offsetLeft + tile.offsetWidth / 2 - scroller.scrollLeft,
    }))
    const anchor = anchors.sort((a, b) => Math.abs(a.center - innerWidth / 2) - Math.abs(b.center - innerWidth / 2))[0]
    // Keep the original covers available when the experiment is switched off.
    const cover = micromilspecCovers[Number(sessionState.getItem('micromilspec:cover')) || 0] ?? micromilspecCovers[0]
    Object.assign(tiles.find(tile => tile.id === 'micromilspec'), { image: `/images/${cover.file}`, ratio: cover.ratio })
    for (const tile of scroller.querySelectorAll('.timeline-tile')) {
      const appearance = thumbnailAppearance(tiles.find(item => item.id === tile.dataset.tileId))
      tile.style.setProperty('--tile-h', appearance.h)
      tile.style.setProperty('--tile-ratio', appearance.ratio)
      tile.querySelector('img').src = appearance.image
    }
    copyWidth = copies[1].offsetLeft - copies[0].offsetLeft
    if (!introDismissed) placeIntro()
    scroller.scrollLeft = useIntroEntry && !userInteracted && !introDismissed
      ? introContentLeft - introEdgeGap()
      : anchor.tile.offsetLeft + anchor.tile.offsetWidth / 2 - anchor.center
    elasticCurrent = scroller.scrollLeft
    measureTiles()
  }
  window.addEventListener(THUMBNAIL_CHANGE, updateThumbnails)
  window.addEventListener('pageshow', updateThumbnails)

  window.addEventListener('keydown', event => {
    if (['Tab', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(event.key)) {
      scroller.querySelectorAll('.is-pointer-return').forEach(tile => tile.classList.remove('is-pointer-return'))
    }
  })

  scroller.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    scroller.scrollBy({ left: event.key === 'ArrowRight' ? 320 : -320, behavior: reducedMotionQuery.matches ? 'instant' : 'smooth' })
  })

  const resetPressState = () => {
    tilePressed = false
    scroller.querySelectorAll('.is-navigating, .is-pressed').forEach(tile => {
      tile.classList.remove('is-navigating', 'is-pressed')
      tile.style.removeProperty('scale')
      tile.style.removeProperty('--project-click-transform')
    })
    updateMagnification()
  }
  window.addEventListener('pageshow', resetPressState)
  window.addEventListener('project:navigation-settled', resetPressState)
  window.addEventListener('project:overview-restored', () => {
    // Reparenting the overview restores native scroll before its queued scroll
    // events run. Align the spring now so a returning thumbnail keeps its size.
    elasticCurrent = scroller.scrollLeft
    clearElasticTransforms()
    measureTiles()
    resetPressState()
  })

  const releasePress = () => {
    tilePressed = false
    scroller.querySelectorAll('.is-pressed').forEach(tile => tile.classList.remove('is-pressed'))
    scheduleElastic()
  }
  scroller.addEventListener('pointerdown', event => {
    const tile = event.target.closest('a.timeline-tile')
    if (isSameTabNavigation(event, tile)) {
      tilePressed = true
      tile.classList.add('is-pressed')
    }
  }, { passive: true })
  window.addEventListener('pointerup', releasePress, { passive: true })
  window.addEventListener('pointercancel', releasePress, { passive: true })
  window.addEventListener('blur', releasePress)

  // Save the clicked position for ordinary navigation and browser Back.
  scroller.addEventListener('click', (event) => {
    const tile = event.target.closest('a.timeline-tile')
    if (!isSameTabNavigation(event, tile)) return
    tile.classList.add('is-navigating')
    sessionState.setItem('timeline:last-case', tile.dataset.tileId)
    const rect = tile.getBoundingClientRect()
    sessionState.setItem('timeline:return-position', JSON.stringify({
      id: tile.dataset.tileId,
      center: (rect.left + rect.width / 2) / innerWidth,
    }))
  })


}
