import { portfolioCases } from './portfolio-data.js'
import micromilspecStoryUrl from './micromilspec-story.mp3?url'
import headphonesIconUrl from './assets/icons/headphones.svg?url'
import closeIconUrl from './assets/icons/close.svg?url'
import pauseIconUrl from './assets/icons/pause.svg?url'
import playIconUrl from './assets/icons/play.svg?url'

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

function projectAudioHtml(singleCase) {
  if (singleCase.id !== 'micromilspec') return ''

  return `<span class="project-audio__sentinel" data-project-audio-sentinel aria-hidden="true"></span>
  <div class="project-audio mt-5">
    <button
      class="project-audio__player"
      type="button"
      data-project-audio-button
      aria-label="Play audio story about MICROMILSPEC"
      aria-pressed="false"
    >
      <img class="project-audio__headphones" src="${headphonesIconUrl}" alt="" width="20" height="22" aria-hidden="true" />
      <span class="project-audio__label" data-audio-label>Personal notes on the project</span>
      <span class="project-audio__duration" data-audio-time>02:21</span>
      <span class="project-audio__toggle" aria-hidden="true">
        <img class="project-audio__toggle-icon project-audio__toggle-icon--play" src="${playIconUrl}" alt="" width="20" height="20" />
        <img class="project-audio__toggle-icon project-audio__toggle-icon--pause" src="${pauseIconUrl}" alt="" width="20" height="20" />
      </span>
    </button>
    <button class="project-audio__transcript-trigger" type="button" data-transcript-open>
      Read notes
    </button>
    <audio data-project-audio src="${micromilspecStoryUrl}" preload="metadata"></audio>
    <dialog class="project-transcript-modal" data-transcript-modal aria-labelledby="micromilspec-transcript-title">
      <button class="project-transcript-modal__close" type="button" data-transcript-close aria-label="Close transcript">
        <img class="project-transcript-modal__close-icon" src="${closeIconUrl}" alt="" width="20" height="20" aria-hidden="true" />
      </button>
      <div class="project-transcript-modal__content">
        <p id="micromilspec-transcript-title" class="project-transcript-modal__eyebrow">My personal notes on the project</p>
        <div class="project-transcript-modal__body">
          <p>I’m really into watches, and it was kind of funny — I had just sold my entire collection because it was taking up too much time. And then, as fate would have it, three months later I’m co-founding a watch company and designing watches.</p>
          <p>Henrik Rye is one of the best founders I know. He has a rare ability to understand product, design, business, marketing, and sales. I’d worked with him on and off for about five years, so when he asked if I wanted to start this with him, it was a no-brainer. I don’t think I’ve ever said yes to anything that fast.</p>
          <p>Everything you see here is designed by me — from the logo and visual identity to the watches themselves.</p>
          <p>I didn’t know anything about 3D at the start. I began in 2D, manually extruding shapes. As we got closer to production, I brought in industrial designer Thomas Jenkins, who helped shape both the first and second version of the case. To keep up, I had to learn cad along the way — if you know, you know.</p>
          <p>The company was built in a very iterative way. Before we had made anything physical, we pre-sold watches for almost 7 million kroner based on quick designs and a simple Readymag site I put together in an evening. With each launch, we improved things — better systems, better design, better copy.</p>
          <p>By around the tenth project, we had a fully automated CMS and a 3D pipeline, where we could spin up a new landing page with a click. A lot of that came from Kim Ellefsen — my partner in crime on the tech side for more than 30 projects. The 3D work is done by Alexander Kadim, and the fluid 3d web experiences are built by wizard Mark Larat.</p>
          <p>I’ve included both version one and two of the marketing site. What’s interesting is that version one is actually what we wanted to launch from day one — we just didn’t have the capability yet. There’s about a year between them, and you can really see the progression.</p>
          <p>This company was honestly a dream. I had to step away because I promised my family I’d work less. But I loved every part of it — from the mechanical details of the watches to packaging and all the small accessories around it.</p>
        </div>
      </div>
    </dialog>
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
      ${projectAudioHtml(singleCase)}
    </div>
    <div class="work-media flex flex-col gap-3 sm:gap-4 md:gap-6">${blocks}</div>
  </section>`
}

export function buildPortfolioHtml() {
  return portfolioCases.map((c, i) => caseSection(c, i)).join('\n')
}
