/* Arkiv-kjelleren: hvert prosjekt har sin egen masonry-blokk med alle bildene
   rett ut (à la offgrid.inc) — man klikker ikke inn i noen case.
   Første celle er et oransje intro-kort; capa-vignetten ligger som levende
   videocelle. Klikk åpner en lightbox med ‹ ›-navigasjon (og ← → / Esc). */

import { archiveCardContent } from './archive-card.js'
import { mediaSize } from './media-dimensions.js'
import { syncVisibleMedia } from './visible-media.js'

// Explicit ordered media names preserve the project boundaries approved by Anders.
const ARCHIVED = [
  {
    "id": "agens",
    "title": "AGENS",
    "year": 2025,
    "files": [
      "andersdrage-agens-002.jpg",
      "andersdrage-agens-001.png",
      "andersdrage-agens-003.jpg",
      "andersdrage-agens-004.jpg"
    ]
  },
  {
    "id": "aprila",
    "title": "Aprila Bank",
    "year": 2018,
    "files": [
      "andersdrage-aprila-001.jpg",
      "andersdrage-aprila-002.jpg",
      "andersdrage-aprila-003.jpg",
      "andersdrage-aprila-004.jpg",
      "andersdrage-aprila-005.jpg"
    ]
  },
  {
    "id": "humming-people",
    "service": "LP & booklet design",
    "year": 2018,
    "title": "Humming People",
    "files": [
      "andersdrage-humming-people-001.jpg",
      "andersdrage-humming-people-002.jpg",
      "andersdrage-humming-people-003.jpg",
      "andersdrage-humming-people-004.jpg",
      "andersdrage-humming-people-005.jpg",
      "andersdrage-humming-people-006.jpg",
      "andersdrage-humming-people-007.jpg",
      "andersdrage-humming-people-008.jpg",
      "andersdrage-humming-people-009.jpg",
      "andersdrage-humming-people-010.jpg",
      "andersdrage-humming-people-011.jpg"
    ]
  },
  {
    "id": "brevio",
    "title": "Brevio",
    "service": "Brand + UX design",
    "year": 2017,
    "files": [
      "andersdrage-brevio-001.jpg",
      "andersdrage-brevio-002.mp4",
      "andersdrage-brevio-003.jpg",
      "andersdrage-brevio-004.jpg",
      "andersdrage-brevio-005.jpg",
      "andersdrage-brevio-006.jpg",
      "andersdrage-brevio-007.jpg",
      "andersdrage-brevio-008.jpg",
      "andersdrage-brevio-009.jpg",
      "andersdrage-brevio-010.jpg",
      "andersdrage-brevio-011.jpg",
      "andersdrage-brevio-012.jpg",
      "andersdrage-brevio-013.jpg",
      "andersdrage-brevio-014.jpg",
      "andersdrage-brevio-015.jpg",
      "andersdrage-brevio-016.mp4",
      "andersdrage-brevio-017.mp4"
    ]
  },
  {
    "id": "klp",
    "title": "KLP",
    "service": "UX design",
    "year": 2017,
    "files": [
      "andersdrage-klp-001.jpg",
      "andersdrage-klp-002.jpg",
      "andersdrage-klp-003.mp4",
      "andersdrage-klp-004.mp4"
    ]
  },
  {
    "id": "just",
    "title": "GoJust",
    "service": "Brand + UX design",
    "year": 2017,
    "files": [
      "andersdrage-just-001.mp4",
      "andersdrage-just-002.mp4",
      "andersdrage-just-003.jpg",
      "andersdrage-just-004.jpg"
    ]
  },
  {
    "id": "abelee",
    "title": "Abelee",
    "service": "Brand + marketing",
    "year": 2017,
    "files": [
      "andersdrage-abelee-001.mp4",
      "andersdrage-abelee-002.mp4"
    ]
  },
  {
    "id": "pressworks",
    "title": "Pressworks",
    "year": 2017,
    "files": [
      "andersdrage-pressworks-001.jpg",
      "andersdrage-pressworks-002.jpg"
    ]
  },
  {
    "id": "kindly",
    "title": "Kindly",
    "service": "Brand + UX design",
    "year": 2016,
    "files": [
      "andersdrage-kindly-001.mp4",
      "andersdrage-kindly-002.mp4",
      "andersdrage-kindly-003.mp4"
    ]
  },
  {
    "id": "changemaker",
    "title": "Changemaker",
    "service": "Brand + UX design",
    "year": 2016,
    "files": [
      "andersdrage-changemaker-001.jpg",
      "andersdrage-changemaker-002.jpg",
      "andersdrage-changemaker-003.jpg",
      "andersdrage-changemaker-004.jpg",
      "andersdrage-changemaker-005.jpg",
      "andersdrage-changemaker-006.jpg",
      "andersdrage-changemaker-007.jpg",
      "andersdrage-changemaker-008.jpg"
    ]
  },
  {
    "id": "nike",
    "title": "Nike app",
    "year": 2016,
    "files": [
      "andersdrage-nike-001.jpg"
    ]
  },
  {
    "id": "houelandek",
    "title": "Houeland-EK",
    "service": "Brand design",
    "year": 2016,
    "files": [
      "andersdrage-houelandek-001.jpg",
      "andersdrage-houelandek-002.jpg",
      "andersdrage-houelandek-003.jpg",
      "andersdrage-houelandek-004.jpg",
      "andersdrage-houelandek-005.jpg",
      "andersdrage-houelandek-006.jpg",
      "andersdrage-houelandek-007.jpg",
      "andersdrage-houelandek-008.jpg",
      "andersdrage-houelandek-009.jpg",
      "andersdrage-houelandek-010.jpg",
      "andersdrage-houelandek-011.jpg",
      "andersdrage-houelandek-012.jpg",
      "andersdrage-houelandek-013.jpg",
      "andersdrage-houelandek-014.jpg",
      "andersdrage-houelandek-015.jpg",
      "andersdrage-houelandek-016.jpg"
    ]
  },
  {
    "id": "kaos",
    "title": "Shopify theme",
    "year": 2016,
    "files": [
      "andersdrage-kaos-001.jpg",
      "andersdrage-kaos-002.jpg",
      "andersdrage-kaos-003.jpg",
      "andersdrage-kaos-004.jpg",
      "andersdrage-kaos-005.jpg",
      "andersdrage-kaos-006.jpg",
      "andersdrage-kaos-007.jpg",
      "andersdrage-kaos-008.jpg",
      "andersdrage-kaos-009.jpg",
      "andersdrage-kaos-010.jpg",
      "andersdrage-kaos-011.jpg",
      "andersdrage-kaos-012.jpg",
      "andersdrage-kaos-013.jpg",
      "andersdrage-kaos-014.jpg"
    ]
  },
  {
    "id": "brathwait",
    "service": "Brand + UX design",
    "year": 2015,
    "title": "Brathwait",
    "files": [
      "andersdrage-brathwait-001.jpg",
      "andersdrage-brathwait-002.jpg",
      "andersdrage-brathwait-003.jpg",
      "andersdrage-brathwait-004.jpg",
      "andersdrage-brathwait-005.jpg",
      "andersdrage-brathwait-006.jpg",
      "andersdrage-brathwait-007.jpg",
      "andersdrage-brathwait-008.jpg",
      "andersdrage-brathwait-009.jpg",
      "andersdrage-brathwait-010.jpg",
      "andersdrage-brathwait-011.jpg",
      "andersdrage-brathwait-012.jpg",
      "andersdrage-brathwait-013.jpg",
      "andersdrage-brathwait-014.jpg",
      "andersdrage-brathwait-015.jpg",
      "andersdrage-brathwait-016.jpg",
      "andersdrage-brathwait-017.jpg",
      "andersdrage-brathwait-018.jpg",
      "andersdrage-brathwait-019.jpg",
      "andersdrage-brathwait-020.jpg",
      "andersdrage-brathwait-021.jpg",
      "andersdrage-brathwait-022.jpg",
      "andersdrage-brathwait-023.jpg"
    ]
  },
  {
    "id": "tone",
    "title": "Tone Damli",
    "service": "Webdesign",
    "year": 2015,
    "files": [
      "andersdrage-tone-001.png",
      "andersdrage-tone-002.png",
      "andersdrage-tone-003.png",
      "andersdrage-tone-004.png"
    ]
  },
  {
    "id": "godt-levert",
    "title": "Godt Levert iOS apps",
    "year": 2015,
    "files": [
      "andersdrage-godt-levert-001.jpg",
      "andersdrage-godt-levert-002.jpg",
      "andersdrage-godt-levert-003.jpg",
      "andersdrage-godt-levert-004.jpg",
      "andersdrage-godt-levert-005.jpg",
      "andersdrage-godt-levert-006.jpg"
    ]
  },
  {
    "id": "hellstrom",
    "title": "Hellstrøm",
    "year": 2015,
    "files": [
      "andersdrage-hellstrom-001.jpg",
      "andersdrage-hellstrom-002.jpg"
    ]
  },
  {
    "id": "hmkg",
    "service": "Print design",
    "year": 2014,
    "title": "HMKG",
    "files": [
      "andersdrage-hmkg-001.jpg",
      "andersdrage-hmkg-002.jpg",
      "andersdrage-hmkg-003.jpg",
      "andersdrage-hmkg-004.jpg"
    ]
  },
  {
    "id": "pelp",
    "title": "Pelp",
    "year": 2014,
    "files": [
      "andersdrage-pelp-001.jpg",
      "andersdrage-pelp-002.jpg",
      "andersdrage-pelp-003.jpg",
      "andersdrage-pelp-004.jpg",
      "andersdrage-pelp-005.jpg",
      "andersdrage-pelp-006.jpg",
      "andersdrage-pelp-007.jpg",
      "andersdrage-pelp-008.jpg",
      "andersdrage-pelp-009.jpg",
      "andersdrage-pelp-010.jpg"
    ]
  },
  {
    "id": "lego",
    "title": "Lego",
    "service": "UX design",
    "year": 2012,
    "files": [
      "andersdrage-lego-001.jpg",
      "andersdrage-lego-002.jpg",
      "andersdrage-lego-003.jpg"
    ]
  },
  {
    "id": "mountain-milk",
    "service": "Packaging design",
    "year": 2011,
    "title": "Mountain Milk",
    "files": [
      "andersdrage-mountain-milk-001.jpg",
      "andersdrage-mountain-milk-002.jpg",
      "andersdrage-mountain-milk-003.jpg",
      "andersdrage-mountain-milk-004.jpg",
      "andersdrage-mountain-milk-005.jpg",
      "andersdrage-mountain-milk-006.jpg"
    ]
  },
  {
    "id": "daccord",
    "title": "D’accord",
    "files": [
      "andersdrage-daccord-001.jpg",
      "andersdrage-daccord-002.jpg",
      "andersdrage-daccord-003.jpg",
      "andersdrage-daccord-004.jpg",
      "andersdrage-daccord-005.jpg",
      "andersdrage-daccord-006.jpg",
      "andersdrage-daccord-007.jpg",
      "andersdrage-daccord-008.jpg",
      "andersdrage-daccord-009.jpg"
    ]
  },
  {
    "id": "poster",
    "title": "Poster",
    "files": [
      "andersdrage-poster-001.jpg"
    ]
  },
  {
    "id": "yearly-report",
    "title": "Yearly report",
    "files": [
      "andersdrage-yearly-report-001.jpg"
    ]
  },
  {
    "id": "lettering",
    "title": "Lettering",
    "files": [
      "andersdrage-lettering-001.jpg"
    ]
  }
]

function collectMedia() {
  const media = [
    {
      type: 'video',
      src: '/images/andersdrage-capa-001.mp4',
      poster: '/images/andersdrage-capa-001-poster.jpg',
      alt: 'Capa vignette',
      title: 'Capa',
      projectId: 'capa',
    },
    { type: 'image', src: '/images/andersdrage-logos-001.jpg', alt: 'Logo overview', title: 'Logos', projectId: 'logos' },
  ]
  ARCHIVED.forEach((project) => {
    const { title, files } = project
    files.forEach((file) => {
      media.push({
        type: /\.(mp4|webm|mov)$/i.test(file) ? 'video' : 'image',
        src: `/images/${file}`,
        poster: /\.(mp4|webm|mov)$/i.test(file) ? `/images/${file.replace(/\.(mp4|webm|mov)$/i, '-poster.jpg')}` : undefined,
        alt: title,
        title,
        projectId: project.id,
        meta: [project.service, project.year].filter(Boolean).join(', '),
      })
    })
  })
  return media
}

/* Oransje intro-kort — erstatter sidens tekst-header, øverst til venstre. */
const CARD_HTML = `<div class="archived-grid__cell">
    <div class="archived-card">
      ${archiveCardContent('archived-intro-title')}
    </div>
  </div>`

export function initArchivedGrid(rootEl) {
  const grid = (rootEl ?? document).querySelector('[data-archived-grid]')
  if (!grid || grid.dataset.ready) return
  grid.dataset.ready = 'true'

  const media = collectMedia()
  const projects = new Map()
  media.forEach((item, index) => {
    if (!projects.has(item.projectId)) projects.set(item.projectId, { ...item, cells: [] })
    projects.get(item.projectId).cells.push({ item, index })
  })

  const cellHtml = (item, index) => `<div class="archived-grid__cell">
      <button type="button" class="archived-grid__item" data-index="${index}" aria-label="Show ${item.alt} large">
        ${
          item.type === 'video'
            ? `<video ${mediaSize(item.src)} data-media-src="${item.src}" loop muted playsinline preload="none" data-media-poster="${item.poster}" disablepictureinpicture disableremoteplayback tabindex="-1"></video>`
            : `<img ${mediaSize(item.src)} data-media-src="${item.src}" alt="${item.alt}" decoding="async" />`
        }
      </button>
    </div>`

  /* Start fresh columns per project: the next block clears every image above it.
     Global media indices remain stable for lightbox navigation and focus return. */
  const narrow = window.matchMedia('(max-width: 900px)')
  const render = () => {
    const columnCount = narrow.matches ? 2 : 4
    const columnsHtml = (cells) => {
      const columns = Array.from({ length: columnCount }, () => [])
      cells.forEach((cell, index) => columns[index % columnCount].push(cell))
      return `<div class="archived-project__grid">${columns.map((cells) => `<div class="archived-grid__col">${cells.join('')}</div>`).join('')}</div>`
    }
    const introCells = [CARD_HTML, ...['capa', 'logos'].map((id) => {
      const project = projects.get(id)
      return `<section aria-labelledby="archived-project-${id}">${project.cells.map(({ item, index }) => cellHtml(item, index)).join('')}
        <h2 class="archived-grid__name" id="archived-project-${id}">${project.title}</h2></section>`
    })]
    const intro = `<li class="archived-project" data-project="intro" aria-labelledby="archived-intro-title">${columnsHtml(introCells)}</li>`
    grid.innerHTML = intro + [...projects.values()].filter((project) => !['capa', 'logos'].includes(project.projectId)).map((project) => {
      const headingId = `archived-project-${project.projectId}`
      const heading = `<h2 class="archived-grid__name" id="${headingId}">${project.title}</h2>`
      const cells = project.cells.map(({ item, index }) => cellHtml(item, index))
      return `<li class="archived-project" data-project="${project.projectId}" aria-labelledby="${headingId}">
        <header class="archived-project__header">${heading}${project.meta ? `<p class="archived-grid__meta">${project.meta}</p>` : ''}</header>
        ${columnsHtml(cells)}
      </li>`
    }).join('')
    syncVisibleMedia(grid)
  }
  render()
  narrow.addEventListener('change', render)

  /* ── Lightbox ── */
  let current = -1
  let box = null
  let triggerIndex = -1

  const show = (index) => {
    current = (index + media.length) % media.length
    const item = media[current]
    const frame = box.querySelector('.archived-lightbox__media')
    frame.innerHTML =
      item.type === 'video'
        ? `<video data-media-controls data-media-src="${item.src}" loop muted playsinline preload="none" poster="${item.poster}" aria-label="${item.alt}"></video>`
        : `<img src="${item.src}" alt="${item.alt}" />`
    /* Telleren er prosjekt-intern: «Brathwait — 5/23», ikke posisjon i hele grid-en. */
    const group = media.filter((entry) => entry.projectId === item.projectId)
    box.querySelector('.archived-lightbox__caption').textContent =
      `${item.title} — ${group.indexOf(item) + 1}/${group.length}`
    syncVisibleMedia(frame)
  }

  const close = () => {
    if (!box) return
    box.querySelector('video')?.pause()
    box.close()
    box.remove()
    box = null
    document.removeEventListener('keydown', onKey, true)
    // The breakpoint renderer may have replaced the original button while open.
    const trigger = grid.querySelector(`[data-index="${triggerIndex}"]`)
    if (trigger && !trigger.closest('[inert]')) trigger.focus({ preventScroll: true })
    else document.querySelector('.world-page:not([inert]) main')?.focus({ preventScroll: true })
  }

  const onKey = (event) => {
    if (!box) return
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopImmediatePropagation()
      close()
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      show(current - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      show(current + 1)
    } else if (event.key === 'Tab') {
      const buttons = [...box.querySelectorAll('button')]
      const active = buttons.indexOf(document.activeElement)
      // Keep the controls reachable even when Safari's full keyboard access is off.
      event.preventDefault()
      buttons[(active + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus()
    }
  }

  const open = (index) => {
    close()
    triggerIndex = index
    box = document.createElement('dialog')
    box.className = 'archived-lightbox'
    box.setAttribute('aria-label', 'Archived work image viewer')
    box.innerHTML = `
      <div class="archived-lightbox__media"></div>
      <p class="archived-lightbox__caption" role="status" aria-atomic="true"></p>
      <button type="button" class="case-nav case-nav--prev" aria-label="Previous image">‹</button>
      <button type="button" class="case-nav case-nav--next" aria-label="Next image">›</button>
      <button type="button" class="case-close archived-lightbox__close" aria-label="Close" autofocus>×</button>`
    box.querySelector('.case-nav--prev').addEventListener('click', (event) => {
      event.stopPropagation()
      show(current - 1)
    })
    box.querySelector('.case-nav--next').addEventListener('click', (event) => {
      event.stopPropagation()
      show(current + 1)
    })
    box.querySelector('.archived-lightbox__close').addEventListener('click', close)
    box.addEventListener('cancel', (event) => {
      event.preventDefault()
      close()
    })
    box.addEventListener('click', (event) => {
      if (event.target === box || event.target.classList.contains('archived-lightbox__media')) close()
    })
    document.addEventListener('keydown', onKey, true)
    document.body.append(box)
    show(index)
    box.showModal()
    syncVisibleMedia(box)
    box.querySelector('.archived-lightbox__close').focus()
  }

  grid.addEventListener('click', (event) => {
    const button = event.target.closest('.archived-grid__item')
    if (button) open(Number(button.dataset.index))
  })
}
