/* Horisontal, loopende tidslinje på forsiden.
   Tre identiske kopier av tilene rendres; scroll holdes alltid i midt-kopien
   (wrap ved 0.5/1.5 × kopibredde) så loopen aldri møter en kant. */

const TILES = [
  {
    id: 'micromilspec',
    title: 'MICROMILSPEC',
    href: '/micromilspec/',
    image: '/images/micromilspec-6-half.jpg',
    color: '#17171b',
    /* Samme aspekt som bildefilen (1600×1770) — tile og case-hero viser da identisk
       utsnitt, så morphen er én og samme flate uten dobbelteksponering. */
    ratio: '1600 / 1770',
    h: '44svh',
  },
  { id: 'p2', color: '#b65c3f', ratio: '1 / 1', h: '30svh' },
  {
    id: 'hjemla',
    title: 'Hjemla',
    href: '/hjemla/',
    image: '/images/hjemla-1-full.jpg',
    color: '#f5c542',
    /* Samme aspekt som bildet (2400×1600) — identisk utsnitt i tile og hero. */
    ratio: '3 / 2',
    h: '34svh',
  },
  {
    id: 'off-market',
    title: 'Off Market',
    href: '/off-market/',
    image: '/images/offmarket-1-full.jpg',
    color: '#2c3e5d',
    /* Samme aspekt som bildet (2560×1707) — identisk utsnitt i tile og hero. */
    ratio: '2560 / 1707',
    h: '40svh',
  },
  { id: 'p5', color: '#c9a227', ratio: '9 / 16', h: '42svh' },
  { id: 'p6', color: '#6d597a', ratio: '5 / 4', h: '28svh' },
  { id: 'p7', color: '#a44a5e', ratio: '1 / 1', h: '36svh' },
  {
    id: 'misc',
    title: 'Selected work',
    href: '/misc/',
    /* Første frame av uber-videoen — samme frame er poster på case-heroen,
       så morphen lander i nøyaktig samme bilde før videoen spiller. */
    image: '/images/misc-uber-poster.jpg',
    color: '#3e6e68',
    ratio: '1920 / 1252',
    h: '30svh',
  },
  { id: 'p9', color: '#8c8577', ratio: '3 / 4', h: '38svh' },
  { id: 'p10', color: '#4a3b32', ratio: '4 / 3', h: '26svh' },
]

function tileHtml(tile) {
  const style = `--tile-bg: ${tile.color}; --tile-ratio: ${tile.ratio}; --tile-h: ${tile.h}`
  /* Tiles med cover-bilde får verken tekstetikett eller bakgrunnsfarge — bildet ER
     tilen. (Bakgrunnen lå bak bildet og dukket opp som svart flate i transition-
     snapshots tatt før bildet var dekodet.) */
  const title = tile.title && !tile.image ? `<span class="timeline-tile__title">${tile.title}</span>` : ''
  /* Cover-bilde: over folden på forsiden — lastes eagert med høy prioritet. */
  const image = tile.image
    ? `<img class="timeline-tile__image" src="${tile.image}" alt="" loading="eager" fetchpriority="high" decoding="async" />`
    : ''
  const classes = `timeline-tile${tile.image ? ' timeline-tile--image' : ''}`
  return tile.href
    ? `<a class="${classes}" href="${tile.href}" data-tile-id="${tile.id}" style="${style}">${image}${title}</a>`
    : `<div class="${classes}" style="${style}" aria-hidden="true">${image}</div>`
}

export function initTimeline() {
  const scroller = document.querySelector('[data-timeline]')
  if (!scroller) return

  const copies = [0, 1, 2].map((copyIndex) => {
    const copy = document.createElement('div')
    copy.className = 'timeline-copy'
    copy.dataset.copy = String(copyIndex)
    copy.innerHTML = TILES.map(tileHtml).join('')
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

  let copyWidth = copies[1].offsetLeft - copies[0].offsetLeft
  /* Den visuelle (myke) scrollposisjonen — jager scrollLeft i elasticFrame. */
  let elasticCurrent = 0

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
  let initialScroll = copyWidth - edgeInset

  /* Lukker man et prosjekt og forsiden lastes på nytt (uten bfcache), skal
     tidslinjen stå ved prosjektet man kom fra — ikke kastes tilbake til start.
     (Med bfcache bevares posisjonen naturlig; denne koden kjører da ikke.) */
  try {
    const fromUrl = window.navigation?.activation?.from?.url ?? document.referrer
    if (/^\/(micromilspec|off-market|misc|hjemla)\/?$/.test(new URL(fromUrl).pathname)) {
      const id = sessionStorage.getItem('timeline:last-case')
      const tile = id ? copies[1].querySelector(`[data-tile-id="${CSS.escape(id)}"]`) : null
      if (tile) {
        const scrollerLeft = scroller.getBoundingClientRect().left
        initialScroll = tile.getBoundingClientRect().left - scrollerLeft + scroller.scrollLeft - edgeInset
      }
    }
  } catch {
    /* ugyldig referrer → standard startposisjon */
  }

  scroller.scrollLeft = initialScroll
  elasticCurrent = scroller.scrollLeft
  settleEdge('instant')
  scroller.addEventListener('scroll', wrap, { passive: true })

  /* NB: ingen auto-snap på scrollend — å flytte lista på egen hånd mellom
     hjul-bursts sloss med brukerens input. Kanten rettes kun når det trengs:
     ved last, resize og i det pan-snapshotet skal tas (nav-klikk under). */

  window.addEventListener('resize', () => {
    const progress = copyWidth ? scroller.scrollLeft / copyWidth : 1
    copyWidth = copies[1].offsetLeft - copies[0].offsetLeft
    scroller.scrollLeft = progress * copyWidth
    elasticCurrent = scroller.scrollLeft
    settleEdge('instant')
    measureTiles()
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
  const finePointer = window.matchMedia('(pointer: fine)')

  let tileGeometry = []
  function measureTiles() {
    const scrollerLeft = scroller.getBoundingClientRect().left
    tileGeometry = [...scroller.querySelectorAll('.timeline-tile')].map((tile) => ({
      tile,
      contentLeft: tile.getBoundingClientRect().left - scrollerLeft + scroller.scrollLeft,
      dirty: false,
    }))
  }
  measureTiles()

  let elasticActive = false
  let lastFrameTime = performance.now()

  /* Idet en case-navigasjon tar snapshot: slipp fjæren helt til ro, så
     avreisebildet fanges uten strekk og ingenting muterer under overgangen. */
  window.addEventListener('pageswap', () => {
    elasticCurrent = scroller.scrollLeft
    clearElasticTransforms()
    elasticActive = false
  })

  function clearElasticTransforms() {
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
    requestAnimationFrame(elasticFrame)
    const dt = Math.min((now - lastFrameTime) / 16.667, 3)
    lastFrameTime = now

    if (reducedMotionQuery.matches || !finePointer.matches) {
      if (elasticActive) {
        elasticCurrent = scroller.scrollLeft
        clearElasticTransforms()
        elasticActive = false
      }
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
      return
    }

    elasticActive = true
    copies.forEach((copy) => {
      copy.style.transform = `translate3d(${tension}px, 0, 0)`
    })

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
      entry.dirty = true
    })
  }
  requestAnimationFrame(elasticFrame)

  scroller.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    scroller.scrollBy({ left: event.key === 'ArrowRight' ? 320 : -320, behavior: 'smooth' })
  })

  /* Klikk på About/Praise midt i en bevegelse rekker ikke å få sitt scrollend — rett
     kanten instant her, før snapshotet til pan-overgangen tas. */
  document.addEventListener(
    'click',
    (event) => {
      if (event.target.closest('.site-header nav a')) settleEdge('instant')
    },
    true,
  )

  /* Scroll-hint (pilene nede til høyre): fader ut når brukeren faktisk har begynt å scrolle. */
  const hint = document.querySelector('[data-scroll-hint]')
  if (hint) {
    const startPosition = scroller.scrollLeft
    function onFirstScroll() {
      if (Math.abs(scroller.scrollLeft - startPosition) < 24) return
      hint.classList.add('is-hidden')
      scroller.removeEventListener('scroll', onFirstScroll)
    }
    scroller.addEventListener('scroll', onFirstScroll, { passive: true })
  }

  /* Fysisk verden: nabokortene på skjermen får egne transition-navn (push-l1…l4 /
     push-r1…r4) så de kan flytte seg UT av veien når kortet zoomer inn — i stedet
     for å bli liggende under det voksende kortet. CSS animerer navnene sidelengs.
     Rydder alltid alle navn først så loop-duplikater aldri gir navnekollisjon. */
  function assignNeighborNames(targetTile) {
    const tiles = [...scroller.querySelectorAll('.timeline-tile')]
    tiles.forEach((tile) => {
      tile.style.viewTransitionName = ''
    })
    const targetRect = targetTile.getBoundingClientRect()
    let left = 0
    let right = 0
    tiles.forEach((tile) => {
      if (tile === targetTile) return
      const rect = tile.getBoundingClientRect()
      if (rect.right < 0 || rect.left > window.innerWidth) return
      if (rect.left < targetRect.left) {
        left += 1
        if (left <= 4) tile.style.viewTransitionName = `push-l${left}`
      } else {
        right += 1
        if (right <= 4) tile.style.viewTransitionName = `push-r${right}`
      }
    })
  }

  function clearAllNames() {
    scroller.querySelectorAll('.timeline-tile').forEach((tile) => {
      tile.style.viewTransitionName = ''
    })
  }

  /* Morph (view transition): kun den klikkede tilen får cover-navnet.
     Tilens senterpunkt lagres så case-siden kan ankre zoom-inn-skaleringen der. */
  scroller.addEventListener('click', (event) => {
    const tile = event.target.closest('a.timeline-tile')
    if (!tile) return
    assignNeighborNames(tile)
    tile.style.viewTransitionName = 'case-cover'
    sessionStorage.setItem('timeline:last-case', tile.dataset.tileId)
    const rect = tile.getBoundingClientRect()
    sessionStorage.setItem(
      'timeline:zoom-origin',
      `${Math.round(rect.left + rect.width / 2)}px ${Math.round(rect.top + rect.height / 2)}px`,
    )
  })

  /* Tilbake-navigasjon fra en case-side: gi navnet til riktig tile i midt-kopien før
     første frame (case-siden morpher inn i tilen), og ankre zoom-ut i tilens posisjon. */
  window.addEventListener('pagereveal', (event) => {
    if (!event.viewTransition) return

    const fromUrl = window.navigation?.activation?.from?.url ?? document.referrer
    let fromCase = false
    try {
      fromCase = /^\/(micromilspec|off-market|misc|hjemla)\/?$/.test(new URL(fromUrl).pathname)
    } catch {
      fromCase = false
    }
    if (!fromCase) return

    const id = sessionStorage.getItem('timeline:last-case')
    if (!id) return
    const tile = copies[1].querySelector(`[data-tile-id="${CSS.escape(id)}"]`)
    if (!tile) return

    /* Naboene får push-navnene sine igjen, så de glir tilbake på plass fra sidene
       (reversen av at de flyttet seg ut av veien ved åpning). */
    assignNeighborNames(tile)
    tile.style.viewTransitionName = 'case-cover'
    const rect = tile.getBoundingClientRect()
    const root = document.documentElement
    root.style.setProperty('--vt-origin', `${Math.round(rect.left + rect.width / 2)}px ${Math.round(rect.top + rect.height / 2)}px`)
    root.classList.add('vt-zoom-out')

    /* finished rejecter når overgangen skippes (helt normalt) — rydd opp i begge utfall. */
    const cleanup = () => {
      clearAllNames()
      root.classList.remove('vt-zoom-out')
    }
    event.viewTransition.finished.then(cleanup, cleanup)
  })
}
