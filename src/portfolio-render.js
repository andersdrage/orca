import { portfolioCases } from './portfolio-data.js'

function isVideo(file) {
  return /\.(mp4|webm|mov)$/i.test(file)
}

function mediaHtml(item) {
  const src = `/images/${item.file}`
  const alt = item.alt ?? ''
  const innerClasses = 'h-auto w-full max-h-[min(92dvh,1200px)] object-contain'

  if (isVideo(item.file)) {
    return `<video class="${innerClasses}" playsinline muted loop autoplay preload="metadata" disablepictureinpicture disableremoteplayback tabindex="-1" aria-label="${escapeAttr(alt)}">
      <source src="${src}" type="video/mp4" />
    </video>`
  }
  return `<img src="${src}" alt="${escapeAttr(alt)}" class="${innerClasses}" loading="lazy" decoding="async" />`
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

/** @param {typeof portfolioCases[number]['items'][number]} item */
function wrapFigure(item) {
  return `<figure class="portfolio-asset w-full overflow-hidden rounded-[24px] bg-zinc-100 ring-1 ring-zinc-200/80">
    ${mediaHtml(item)}
  </figure>`
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

function caseSection(singleCase) {
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

  return `<section id="${singleCase.id}" class="scroll-mt-24 border-t border-zinc-200/90 pt-14 first:border-t-0 first:pt-8" aria-labelledby="title-${singleCase.id}">
    <div class="mb-8 w-full">
      <h2 id="title-${singleCase.id}" class="font-display text-xl font-semibold tracking-tight text-zinc-900 md:text-2xl">${singleCase.title}</h2>
      <p class="mt-2 text-sm leading-relaxed text-zinc-600 md:text-base">${singleCase.intro}</p>
    </div>
    <div class="flex w-full flex-col gap-3 sm:gap-4 md:gap-6">${blocks}</div>
  </section>`
}

export function buildPortfolioHtml() {
  return portfolioCases.map(caseSection).join('\n')
}
