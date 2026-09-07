/* Arkiv-kjelleren: hvert prosjekt har sin egen masonry-blokk med alle bildene
   rett ut (à la offgrid.inc) — man klikker ikke inn i noen case.
   Første celle er et oransje intro-kort; capa-vignetten ligger som levende
   videocelle. Klikk åpner en lightbox med ‹ ›-navigasjon (og ← → / Esc). */

import { portfolioCases } from './portfolio-data.js'

const showreelSlides = (first, last = first) =>
  Array.from({ length: last - first + 1 }, (_, index) => `showreel/${first + index}.jpg`)

const ARCHIVED = [
  { id: 'agens', title: 'AGENS', year: 2025, files: ['agens-1.png', 'misc-agens-1.jpg', 'misc-agens-2.jpg', 'misc-agens-3.jpg', 'misc-agens-4.jpg'] },
  { id: 'aprila', title: 'Aprila Bank', year: 2018, files: ['misc-aprila.jpg'] },
  { id: 'brevio', title: 'Brevio', year: 2019, files: ['misc-brevio.jpg'] },
  { id: 'nike', title: 'Nike app', year: 2016, files: ['misc-nike.jpg'] },
  { id: 'pressworks', title: 'Pressworks', year: 2017, files: ['misc-pressworks.jpg', 'pressworks-mobile-v1.jpg'] },
  { id: 'hmkg', service: 'Print design', year: 2024 },
  { id: 'humming-people', service: 'LP & booklet design', year: 2016 },
  { id: 'brathwait', service: 'Brand + UX design', year: 2015 },
  { id: 'mountain-milk', service: 'Packaging design', year: 2011 },
  {
    /* Har ingen case — filene listes direkte. */
    id: 'houelandek',
    title: 'Houeland-EK',
    service: 'Brand design',
    year: 2016,
    files: ['01', '02', '03', '04', '06', '07', '08', '11', '12', '14', '17', '20', '21', '22', '23', '24'].map(
      (n) => `houelandek/${n}.jpg`,
    ),
  },
  /* Project boundaries confirmed by Anders. Divider slides 36, 57, 67, 70
     and 73 are omitted; typography specimens and UI layouts remain work. */
  { id: 'pelp', title: 'Pelp', files: showreelSlides(26, 35) },
  { id: 'godt-levert', title: 'Godt Levert iOS apps', files: showreelSlides(37, 42) },
  { id: 'kaos', title: 'Shopift theme', files: showreelSlides(43, 56) },
  { id: 'daccord', title: 'D’accord', files: showreelSlides(58, 66) },
  { id: 'hellstrom', title: 'Hellstrøm', files: showreelSlides(68, 69) },
  { id: 'poster', title: 'Poster', files: showreelSlides(71) },
  { id: 'yearly-report', title: 'Yearly report', files: showreelSlides(72) },
  { id: 'lettering', title: 'Lettering', files: showreelSlides(74) },
]

function collectMedia() {
  const media = [
    {
      type: 'video',
      src: '/images/capa-vignette.mp4',
      poster: '/images/capa-vignette-poster.jpg',
      alt: 'Capa vignette',
      title: 'Capa',
      projectId: 'capa',
    },
    { type: 'image', src: '/images/misc-logos.jpg', alt: 'Logo overview', title: 'Logos', projectId: 'logos' },
  ]
  ARCHIVED.forEach((project) => {
    const singleCase = portfolioCases.find((c) => c.id === project.id)
    const title = project.title ?? singleCase?.title
    const files = project.files ?? singleCase?.items.map((item) => item.file) ?? []
    files
      .filter((file) => !/\.(mp4|webm|mov)$/i.test(file))
      .forEach((file) => {
        media.push({
          type: 'image',
          src: `/images/${file}`,
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
      <h2 class="archived-card__title" id="archived-intro-title">Archived<br />work</h2>
      <p class="archived-card__meta">Miscellaneous work (2012–Present)</p>
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
            ? `<video autoplay loop muted playsinline preload="metadata" poster="${item.poster}" disablepictureinpicture disableremoteplayback tabindex="-1"><source src="${item.src}" type="video/mp4" /></video>`
            : `<img src="${item.src}" alt="${item.alt}" loading="lazy" decoding="async" />`
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
        ? `<video autoplay loop muted playsinline poster="${item.poster}"><source src="${item.src}" type="video/mp4" /></video>`
        : `<img src="${item.src}" alt="${item.alt}" />`
    /* Telleren er prosjekt-intern: «Brathwait — 5/23», ikke posisjon i hele grid-en. */
    const group = media.filter((entry) => entry.projectId === item.projectId)
    box.querySelector('.archived-lightbox__caption').textContent =
      `${item.title} — ${group.indexOf(item) + 1}/${group.length}`
  }

  const close = () => {
    if (!box) return
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
    box.querySelector('.archived-lightbox__close').focus()
  }

  grid.addEventListener('click', (event) => {
    const button = event.target.closest('.archived-grid__item')
    if (button) open(Number(button.dataset.index))
  })
}
