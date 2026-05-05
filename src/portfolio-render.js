import { portfolioCases } from './portfolio-data.js'

function isVideo(file) {
  return /\.(mp4|webm|mov)$/i.test(file)
}

function mediaHtml(item) {
  const src = `/images/${item.file}`
  const alt = item.alt ?? ''
  /* Samme som bilder: full bredde, naturlig høyde — unngår letterboxing mot figure-bakgrunnen. */
  const mediaClasses = 'h-auto w-full'

  if (isVideo(item.file)) {
    return `<video class="${mediaClasses}" playsinline muted loop autoplay preload="metadata" disablepictureinpicture disableremoteplayback tabindex="-1" aria-label="${escapeAttr(alt)}">
      <source src="${src}" type="video/mp4" />
    </video>`
  }
  return `<img src="${src}" alt="${escapeAttr(alt)}" class="${mediaClasses}" loading="lazy" decoding="async" />`
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function escapeHtmlText(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** @param {typeof portfolioCases[number]['items'][number]} item */
function captionHtml(item) {
  const raw = item.caption?.trim()
  if (!raw) return ''
  return `<p class="work-narrow mx-auto mt-2 px-1 text-center text-[10px] leading-snug text-zinc-600">${escapeHtmlText(raw)}</p>`
}

/** @param {typeof portfolioCases[number]['items'][number]} item */
function wrapFigure(item) {
  return `<div class="portfolio-item w-full">
  <figure class="portfolio-asset w-full overflow-hidden rounded-[24px] bg-zinc-100">
    ${mediaHtml(item)}
  </figure>${captionHtml(item)}
  </div>`
}

/**
 * Pair consecutive `half` items into one row; `full` spans the grid.
 */
function layoutRows(items) {
  /** @type {{ kind: 'full' | 'half-row', items: typeof items }[]} */
  const rows = []
  let buf = []
  for (const item of items) {
    if (item.span === 'half') {
      buf.push(item)
      if (buf.length === 2) {
        rows.push({ kind: 'half-row', items: [...buf] })
        buf = []
      }
    } else {
      if (buf.length) {
        rows.push({ kind: 'half-row', items: [...buf] })
        buf = []
      }
      rows.push({ kind: 'full', items: [item] })
    }
  }
  if (buf.length) rows.push({ kind: 'half-row', items: [...buf] })
  return rows
}

function caseSection(singleCase, index) {
  const isFirst = index === 0
  const rows = layoutRows(singleCase.items)
  const blocks = rows
    .map((row) => {
      if (row.kind === 'full') {
        return wrapFigure(row.items[0])
      }
      const cells = row.items.map((item) => `<div class="portfolio-half min-w-0">${wrapFigure(item)}</div>`).join('')
      return `<div class="w-full">
        <div class="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 md:gap-4">${cells}</div>
      </div>`
    })
    .join('\n')

  return `<section id="${singleCase.id}" class="scroll-mt-24 ${isFirst ? 'pt-8' : ''}" aria-labelledby="title-${singleCase.id}">
    ${isFirst ? '' : '<div class="work-narrow work-section-rule" aria-hidden="true"></div>'}
    <div class="work-narrow mb-8 w-full">
      <h2 id="title-${singleCase.id}" class="font-label text-center text-xl font-semibold uppercase tracking-tight text-zinc-900 md:text-2xl">${singleCase.title}</h2>
      <p class="mt-2 text-center text-sm leading-relaxed text-zinc-600 md:text-base">${singleCase.intro}</p>
    </div>
    <div class="work-media flex flex-col gap-3 sm:gap-4 md:gap-6">${blocks}</div>
  </section>`
}

export function buildPortfolioHtml() {
  return portfolioCases.map((c, i) => caseSection(c, i)).join('\n')
}
