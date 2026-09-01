/* Arkiv-kjelleren: ALLE bildene fra de arkiverte prosjektene ligger rett ut i
   et masonry-grid (à la offgrid.inc) — man klikker ikke inn i noen case.
   Første bilde i hvert prosjekt bærer navn + service/år. Klikk på et bilde
   åpner en lightbox med ‹ ›-navigasjon (og ← → / Esc). */

import { portfolioCases } from './portfolio-data.js'

const ARCHIVED = [
  { id: 'hmkg', service: 'Print design', year: 2024 },
  { id: 'humming-people', service: 'LP & booklet design', year: 2016 },
  { id: 'brathwait', service: 'Brand + UX design', year: 2015 },
  { id: 'mountain-milk', service: 'Packaging design', year: 2021 },
]

function collectImages() {
  const images = []
  ARCHIVED.forEach((project) => {
    const singleCase = portfolioCases.find((c) => c.id === project.id)
    if (!singleCase) return
    singleCase.items
      .filter((item) => !/\.(mp4|webm|mov)$/i.test(item.file))
      .forEach((item, index) => {
        images.push({
          src: `/images/${item.file}`,
          alt: item.alt ?? singleCase.title,
          title: singleCase.title,
          meta: `${project.service}, ${project.year}`,
          firstOfProject: index === 0,
        })
      })
  })
  return images
}

export function initArchivedGrid(rootEl) {
  const grid = (rootEl ?? document).querySelector('[data-archived-grid]')
  if (!grid || grid.dataset.ready) return
  grid.dataset.ready = 'true'

  const images = collectImages()
  grid.innerHTML = images
    .map(
      (image, index) => `<li>
        <button type="button" class="archived-grid__item" data-index="${index}" aria-label="Show ${image.alt} large">
          <img src="${image.src}" alt="${image.alt}" loading="lazy" decoding="async" />
        </button>
        ${
          image.firstOfProject
            ? `<span class="archived-grid__name">${image.title}</span>
               <span class="archived-grid__meta">${image.meta}</span>`
            : ''
        }
      </li>`,
    )
    .join('')

  /* ── Lightbox ── */
  let current = -1
  let box = null

  const show = (index) => {
    current = (index + images.length) % images.length
    const image = images[current]
    box.querySelector('img').src = image.src
    box.querySelector('img').alt = image.alt
    box.querySelector('.archived-lightbox__caption').textContent =
      `${image.title} — ${current + 1}/${images.length}`
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
      <img src="" alt="" />
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
      if (event.target === box) close()
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
