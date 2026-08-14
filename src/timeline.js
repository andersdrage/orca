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
  { id: 'p3', color: '#6b7f5c', ratio: '16 / 10', h: '34svh' },
  { id: 'off-market', title: 'Off Market', href: '/off-market/', color: '#2c3e5d', ratio: '3 / 2', h: '40svh' },
  { id: 'p5', color: '#c9a227', ratio: '9 / 16', h: '42svh' },
  { id: 'p6', color: '#6d597a', ratio: '5 / 4', h: '28svh' },
  { id: 'p7', color: '#a44a5e', ratio: '1 / 1', h: '36svh' },
  { id: 'misc', title: 'Selected work', href: '/misc/', color: '#3e6e68', ratio: '21 / 9', h: '30svh' },
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

  function wrap() {
    if (!copyWidth) return
    const x = scroller.scrollLeft
    if (x < copyWidth * 0.5) scroller.scrollLeft = x + copyWidth
    else if (x > copyWidth * 1.5) scroller.scrollLeft = x - copyWidth
  }

  /* Start ved midt-kopien med ~360px luft til venstre for første tile. Sømgapet
     (kopienes padding-right) er større enn inset-en, så forrige loop-runde ligger
     helt utenfor skjermen ved inngang — den avsløres først når man scroller bakover. */
  const edgeInset = Math.min(360, Math.round(window.innerWidth * 0.4))
  scroller.scrollLeft = copyWidth - edgeInset
  scroller.addEventListener('scroll', wrap, { passive: true })

  window.addEventListener('resize', () => {
    const progress = copyWidth ? scroller.scrollLeft / copyWidth : 1
    copyWidth = copies[1].offsetLeft - copies[0].offsetLeft
    scroller.scrollLeft = progress * copyWidth
  })

  /* Vanlig (vertikalt) scrollehjul driver horisontal scroll. Magic Mouse/trackpad
     sender allerede deltaX og får native oppførsel — de røres ikke. */
  scroller.addEventListener(
    'wheel',
    (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      event.preventDefault()
      const scale = event.deltaMode === 1 ? 32 : event.deltaMode === 2 ? scroller.clientWidth : 1
      scroller.scrollLeft += event.deltaY * scale
    },
    { passive: false },
  )

  scroller.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    scroller.scrollBy({ left: event.key === 'ArrowRight' ? 320 : -320, behavior: 'smooth' })
  })

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
      fromCase = /^\/(micromilspec|off-market|misc)\/?$/.test(new URL(fromUrl).pathname)
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
