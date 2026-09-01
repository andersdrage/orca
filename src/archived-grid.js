/* Arkiv-kjelleren: ALLE bildene fra de arkiverte prosjektene ligger rett ut i
   et masonry-grid (à la offgrid.inc) — man klikker ikke inn i noen case.
   Første celle er et oransje intro-kort; capa-vignetten ligger som levende
   videocelle. Klikk åpner en lightbox med ‹ ›-navigasjon (og ← → / Esc). */

import { portfolioCases } from './portfolio-data.js'

const ARCHIVED = [
  { id: 'hmkg', service: 'Print design', year: 2024 },
  { id: 'humming-people', service: 'LP & booklet design', year: 2016 },
  { id: 'brathwait', service: 'Brand + UX design', year: 2015 },
  { id: 'mountain-milk', service: 'Packaging design', year: 2021 },
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
]

function collectMedia() {
  const media = [
    {
      type: 'video',
      src: '/images/capa-vignette.mp4',
      poster: '/images/capa-vignette-poster.jpg',
      alt: 'Capa vignette',
      title: 'Capa',
    },
  ]
  ARCHIVED.forEach((project) => {
    const singleCase = portfolioCases.find((c) => c.id === project.id)
    const title = project.title ?? singleCase?.title
    const files = project.files ?? singleCase?.items.map((item) => item.file) ?? []
    files
      .filter((file) => !/\.(mp4|webm|mov)$/i.test(file))
      .forEach((file, index) => {
        media.push({
          type: 'image',
          src: `/images/${file}`,
          alt: title,
          title,
          meta: `${project.service}, ${project.year}`,
          firstOfProject: index === 0,
        })
      })
  })
  return media
}

/* Oransje intro-kort — erstatter sidens tekst-header, øverst til venstre. */
const CARD_HTML = `<div class="archived-grid__cell">
    <div class="archived-card" role="heading" aria-level="2">
      <h2 class="archived-card__title">Archived<br />work</h2>
      <p class="archived-card__meta">Miscellanous work from<br />2012 and up to now</p>
    </div>
  </div>`

export function initArchivedGrid(rootEl) {
  const grid = (rootEl ?? document).querySelector('[data-archived-grid]')
  if (!grid || grid.dataset.ready) return
  grid.dataset.ready = 'true'

  const media = collectMedia()

  const cellHtml = (item, index) => `<div class="archived-grid__cell">
      <button type="button" class="archived-grid__item" data-index="${index}" aria-label="Show ${item.alt} large">
        ${
          item.type === 'video'
            ? `<video autoplay loop muted playsinline preload="metadata" poster="${item.poster}" disablepictureinpicture disableremoteplayback tabindex="-1"><source src="${item.src}" type="video/mp4" /></video>`
            : `<img src="${item.src}" alt="${item.alt}" loading="lazy" decoding="async" />`
        }
      </button>
      ${
        item.firstOfProject
          ? `<span class="archived-grid__name">${item.title}</span>
             <span class="archived-grid__meta">${item.meta}</span>`
          : ''
      }
    </div>`

  /* Leserekkefølgen går VENSTRE → HØYRE: cellene deles rundgang-vis på
     kolonnene, så celle 1–4 danner øverste visuelle rad (kortet først). */
  const narrow = window.matchMedia('(max-width: 900px)')
  const render = () => {
    const columnCount = narrow.matches ? 2 : 4
    const columns = Array.from({ length: columnCount }, () => [])
    const cells = [CARD_HTML, ...media.map(cellHtml)]
    cells.forEach((cell, index) => {
      columns[index % columnCount].push(cell)
    })
    grid.innerHTML = columns.map((cells) => `<li class="archived-grid__col">${cells.join('')}</li>`).join('')
  }
  render()
  narrow.addEventListener('change', render)

  /* ── Lightbox ── */
  let current = -1
  let box = null

  const show = (index) => {
    current = (index + media.length) % media.length
    const item = media[current]
    const frame = box.querySelector('.archived-lightbox__media')
    frame.innerHTML =
      item.type === 'video'
        ? `<video autoplay loop muted playsinline poster="${item.poster}"><source src="${item.src}" type="video/mp4" /></video>`
        : `<img src="${item.src}" alt="${item.alt}" />`
    /* Telleren er prosjekt-intern: «Brathwait — 5/23», ikke posisjon i hele grid-en. */
    const group = media.filter((entry) => entry.title === item.title)
    box.querySelector('.archived-lightbox__caption').textContent =
      `${item.title} — ${group.indexOf(item) + 1}/${group.length}`
  }

  const close = () => {
    box?.remove()
    box = null
    document.removeEventListener('keydown', onKey, true)
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
    }
  }

  const open = (index) => {
    close()
    box = document.createElement('div')
    box.className = 'archived-lightbox'
    box.innerHTML = `
      <div class="archived-lightbox__media"></div>
      <p class="archived-lightbox__caption"></p>
      <button type="button" class="case-nav case-nav--prev" aria-label="Previous image">‹</button>
      <button type="button" class="case-nav case-nav--next" aria-label="Next image">›</button>
      <button type="button" class="case-close archived-lightbox__close" aria-label="Close">×</button>`
    box.querySelector('.case-nav--prev').addEventListener('click', (event) => {
      event.stopPropagation()
      show(current - 1)
    })
    box.querySelector('.case-nav--next').addEventListener('click', (event) => {
      event.stopPropagation()
      show(current + 1)
    })
    box.querySelector('.archived-lightbox__close').addEventListener('click', close)
    box.addEventListener('click', (event) => {
      if (event.target === box || event.target.classList.contains('archived-lightbox__media')) close()
    })
    document.addEventListener('keydown', onKey, true)
    document.body.append(box)
    show(index)
  }

  grid.addEventListener('click', (event) => {
    const button = event.target.closest('.archived-grid__item')
    if (button) open(Number(button.dataset.index))
  })
}
