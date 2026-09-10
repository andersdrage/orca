import { portfolioCases } from './portfolio-data.js'
import { mediaSize, mediaRatio } from './media-dimensions.js'
import micromilspecStoryUrl from './micromilspec-story.mp3?url'
import offmarketStoryUrl from './offmarket-story.mp3?url'
import headphonesIconUrl from './assets/icons/headphones.svg?url'
import closeIconUrl from './assets/icons/close.svg?url'
import pauseIconUrl from './assets/icons/pause.svg?url'
import readIconUrl from './assets/icons/read.svg?url'
import finnLogoSource from '../public/images/finn-logo-morph.svg?raw'

function isVideo(file) {
  return /\.(mp4|webm|mov)$/i.test(file)
}

function mediaHtml(item, eager = false) {
  const src = `/images/${item.file}`
  const alt = item.alt ?? ''
  /* Samme som bilder: full bredde, naturlig høyde — unngår letterboxing mot figure-bakgrunnen. */
  const mediaClasses = 'h-auto w-full'

  if (isVideo(item.file)) {
    /* Poster = første frame (scripts genererer <navn>-poster.jpg) — noe synlig umiddelbart
       mens selve videofilen (opptil ~15MB) strømmer inn. */
    const poster = src.replace(/\.(mp4|webm|mov)$/i, '-poster.jpg')
    return `<video ${mediaSize(item.file)} class="${mediaClasses}" data-media-controls playsinline muted loop preload="none" ${eager ? 'poster' : 'data-media-poster'}="${poster}" data-media-src="${src}" disablepictureinpicture disableremoteplayback tabindex="-1" aria-label="${escapeAttr(alt)}"></video>`
  }
  const loadingAttrs = eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'
  return `<img ${mediaSize(item.file)} src="${src}" alt="${escapeAttr(alt)}" class="${mediaClasses}" ${loadingAttrs} decoding="async" />`
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

/* Credits-oversikt à la Writing-lista på benji.org: grå «Credits»-etikett,
   rolle i venstre gutter, navn som hovedtekst, hairlines mellom radene. */
function creditsHtml(singleCase) {
  if (!singleCase.credits?.length) return ''
  const grouped = new Map()
  for (const credit of singleCase.credits) {
    const names = grouped.get(credit.role) ?? []
    names.push(credit.names)
    grouped.set(credit.role, names)
  }
  const rows = [...grouped].map(([role, names]) => ({ role, names: names.join(' and ') }))
    .map(
      (credit) => `<div class="case-credits__row">
        <dt class="case-credits__role">${escapeHtmlText(credit.role)}</dt>
        <dd class="case-credits__names">${escapeHtmlText(credit.names)}</dd>
      </div>`,
    )
    .join('\n')
  return `<div class="case-credits"><p class="case-credits__label">Credits</p><dl>${rows}</dl></div>`
}

function titleBlockHtml(singleCase) {
  const grouped = new Map()
  for (const credit of singleCase.credits ?? []) {
    const names = grouped.get(credit.role) ?? []
    names.push(...credit.names.split(/,\s*|\s+and\s+/).filter(name => name.trim() !== 'Anders Drage'))
    if (names.length) grouped.set(credit.role, names)
  }
  const ownCredit = singleCase.credits?.find(credit => credit.names.includes('Anders Drage'))
  const role = ownCredit?.role.replace(/^Designers$/, 'Designer') ?? 'Designer'
  const cell = (label, value, modifier = '') => `<div class="title-block__cell ${modifier}"><dt>${escapeHtmlText(label)}</dt><dd>${escapeHtmlText(value)}</dd></div>`
  const groups = [...grouped].flatMap(([role, names]) => singleCase.separateCreditRoles?.includes(role)
    ? names.map(name => [role, [name]])
    : [[role, names]])
  const contributors = groups.map(([role, names]) => `<div class="title-block__cell title-block__credit${names.length > 2 ? ' title-block__credit--wide' : ''}">
    <dt>${escapeHtmlText(role)}</dt>
    <dd>${names.map(name => `<span>${escapeHtmlText(name)}</span>`).join('')}</dd>
  </div>`).join('')
  const columns = groups.length === 4 && groups.every(([, names]) => names.length <= 2) ? 2 : 3
  return `<div class="case-title-block" style="--credit-columns: ${columns}" aria-label="Project details and credits">
    <dl class="title-block__header">
      ${cell('Project', singleCase.title, 'title-block__project')}
      ${singleCase.year ? cell('Year', singleCase.year, 'title-block__year') : ''}
      ${cell('Role', role, 'title-block__role')}
      <div class="title-block__signature" aria-hidden="true"><img src="/images/dragonmark.svg" alt="" width="77" height="57" /></div>
    </dl>
    ${contributors ? `<dl class="title-block__contributors">${contributors}</dl>` : ''}
  </div>`
}

/** @param {typeof portfolioCases[number]['items'][number]} item */
function wrapFigure(item, eager = false) {
  const figureStyle = item.maxWidth
    ? `max-width: ${Number(item.maxWidth)}px; margin-inline: auto`
    : eager && isVideo(item.file) ? `width: min(100%, calc(90svh * ${mediaRatio(item.file)}))` : ''
  return `<div class="portfolio-item w-full">
  <figure ${figureStyle ? `style="${figureStyle}"` : ''} class="portfolio-asset w-full overflow-hidden bg-zinc-100">
    ${mediaHtml(item, eager)}
  </figure>${captionHtml(item)}
  </div>`
}

function tabsHtml(item) {
  const tabs = item.tabs.map((tab, index) => `<button type="button" class="t-tab" role="tab"
    id="${item.id}-tab-${index}" aria-controls="${item.id}-panel-${index}"
    aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}">${escapeHtmlText(tab.label)}</button>`).join('')
  const panels = item.tabs.map((tab, index) => `<div role="tabpanel" id="${item.id}-panel-${index}"
    aria-labelledby="${item.id}-tab-${index}" tabindex="0"${index ? ' hidden' : ''}>
    <figure class="portfolio-asset"><img src="/images/${escapeAttr(tab.file)}"
      alt="Uber website design — ${escapeAttr(tab.label)}" ${mediaSize(tab.file)}
      loading="lazy" decoding="async" /></figure>
  </div>`).join('')
  const introduction = item.heading ? `<header class="case-tabs__intro">
    <h2 id="${item.id}-heading" class="case-tabs__heading">${escapeHtmlText(item.heading)}</h2>
    <p class="case-tabs__description">${escapeHtmlText(item.description)}</p>
  </header>` : ''
  return `<div class="case-tabs${item.heading ? ' case-tabs--framed' : ''}" data-case-tabs${item.heading ? ` role="group" aria-labelledby="${item.id}-heading"` : ''}>
    ${introduction}
    <div class="case-tabs__scroll"><div class="t-tabs" role="tablist" aria-label="${escapeAttr(item.label)}">
      <span class="t-tabs-pill" aria-hidden="true"></span>${tabs}
    </div></div>
    ${panels}
  </div>`
}

function logoMorphHtml() {
  const labels = ['Original logo', 'New logo', 'Mobile logo']
  return `<div class="portfolio-item w-full">
    <div class="finn-logo-morph" data-logo-morph role="group" aria-label="FINN logo evolution">
      <div id="finn-logo-panel" role="tabpanel" aria-labelledby="finn-logo-tab-0">
        <svg class="finn-logo-morph__art" viewBox="-150 -84.375 300 168.75" role="img" aria-label="Original FINN logo">
          <g data-logo-drawing></g>
        </svg>
      </div>
      <div class="finn-logo-morph__controls">
        <div class="t-tabs" role="tablist" aria-label="FINN logo versions">
          <span class="t-tabs-pill" aria-hidden="true"></span>
          ${labels.map((label, i) => `<button class="t-tab" type="button" role="tab" id="finn-logo-tab-${i}"
            aria-controls="finn-logo-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${label}</button>`).join('')}
        </div>
      </div>
      <template data-logo-source>${finnLogoSource.replace(/<\?xml[^>]*\?>/, '')}</template>
    </div>
  </div>`
}

function galleryHtml(item) {
  return `<div class="case-gallery" role="group" aria-label="${escapeAttr(item.label)}">
    ${item.images.map((image) => `<button type="button" class="case-gallery__item" data-case-image="/images/${escapeAttr(image.file)}" data-image-label="${escapeAttr(image.alt)}" aria-label="Enlarge ${escapeAttr(image.alt)}">
      <span>${escapeHtmlText(image.alt)} <span aria-hidden="true">+</span></span>
      <img src="/images/${escapeAttr(image.file)}" ${mediaSize(image.file)} alt="" loading="lazy" decoding="async" />
    </button>`).join('')}
  </div>`
}

function comparisonHtml(item) {
  return `<div class="portfolio-item w-full">
    <figure class="portfolio-asset case-comparison" data-case-comparison aria-label="${escapeAttr(item.label)}">
      <img class="case-comparison__image" src="/images/${escapeAttr(item.after.file)}" ${mediaSize(item.after.file)} alt="${escapeAttr(item.after.alt)}" loading="lazy" decoding="async" />
      <img class="case-comparison__image case-comparison__before" src="/images/${escapeAttr(item.before.file)}" ${mediaSize(item.before.file)} alt="${escapeAttr(item.before.alt)}" loading="lazy" decoding="async" />
      <span class="case-comparison__label case-comparison__label--before" aria-hidden="true">Before</span>
      <span class="case-comparison__label case-comparison__label--after" aria-hidden="true">After</span>
      <input class="case-comparison__slider" type="range" min="0" max="100" step="1" value="50" aria-label="${escapeAttr(item.label)}" aria-valuetext="50% before, 50% after" />
      <div class="case-comparison__divider" aria-hidden="true">
        <span class="case-comparison__handle"><svg width="24" height="20" viewBox="0 0 24 20" fill="none"><path d="m8 5-5 5 5 5m8-10 5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg></span>
      </div>
    </figure>
    <p class="case-comparison__caption">Drag to compare</p>
  </div>`
}

const projectAudio = {
  uber: {
    ariaName: 'Uber',
    title: 'My personal notes on Uber',
    body: [
      "I was in San Francisco working with Lever, a recruiting company. A wonderful guy named Andreas had invited me over to help with their branding, and I was getting close to the end of my stay when I suddenly got a DM from Halli.",
      "“Are you still in SF?”",
      "Now, Halli — Haraldur Thorleifsson — is a living legend in the design world. Someone whose work I’d admired for a long time.",
      "So when Halli asks, you show up.",
      "I went over to his office, and within minutes I understood why he was so good. I ended up working with him and the team at Ueno for a couple of weeks on Uber’s global website. It was a short time, but it changed a lot for me — how I thought about design, business, and working with clients.",
      "On Uber’s side, we worked with Shalin Amin and Strahan McMullen, both incredibly talented guys. Between them and the Ueno team, there was a lot to take in.",
      "I remember having a meeting in the famous War Room, before it became famous. Funny to think back on that now.",
      "The project itself was about helping Uber move from an all-black world into something friendlier and more colorful. We were building a global design system, but every place needed room for its own character — through language, color, patterns, and Stout’s illustrations of cities around the world.",
      "The scale of that work still amazes me. One system had to make sense across so many different places and languages. It was my first time designing for right-to-left reading, which was a fascinating challenge.",
      "And I loved “the bit” — that little square that gave the main call to action a home. Such a simple thing, but always there to show you the way.",
      "I’m really grateful that Halli brought me in and that the team trusted me. I learned so much in those few weeks. It’s one of those experiences that stays with you long after the project is finished."
    ],
  },
  micromilspec: {
    src: micromilspecStoryUrl,
    fallbackDuration: 167,
    durationLabel: '02:47',
    ariaName: 'MICROMILSPEC',
    title: 'My personal notes on Micromilspec',
    body: [
      'I’m really into watches, and it was kind of funny — I had just sold my entire collection because it was taking up too much time. And then, as fate would have it, three months later I’m co-founding a watch company and designing watches.',
      'Henrik Rye is one of the best founders I know. He has a rare ability to understand product, design, business, marketing, and sales. I’d worked with him on and off for about five years, so when he asked if I wanted to start this with him, it was a no-brainer. I don’t think I’ve ever said yes to anything that fast.',
      'The original idea came from discovering that elite military units — especially groups like the SAS in the UK — loved custom engraved watches, but even they struggled to convince brands like Rolex or Omega to alter their production lines for small custom runs.',
      'That became our lightbulb moment.',
      'What if we turned the whole thing upside down?',
      'Instead of treating customization as a disruption to production — what if custom work was the production model?',
      'What made it even more interesting was realizing that many of the big watch brands originally grew by supplying watches to the military. That work helped fund the research and development that eventually shaped modern wristwatches.',
      'Everything you see here is designed by me — from the logo and visual identity to the watches themselves.',
      'I didn’t know anything about 3D at the start. I began in 2D, manually extruding shapes. As we got closer to production, I brought in industrial designer Thomas Jenkins, who helped shape both the first and second version of the case. To keep up, I had to learn CAD along the way — if you know, you know.',
      'The company was built in a very iterative way. Before we had made anything physical, we pre-sold watches for almost 7 million kroner based on quick designs and a simple Readymag site I put together in an evening. With each launch, we improved things — better systems, better design, better copy.',
      'By around the tenth project, we had a fully automated CMS and a 3D pipeline, where we could spin up a new landing page with a click. A lot of that came from Kim Ellefsen — my partner in crime on the tech side for more than 30 projects. The 3D work is done by Alexander Kadim, and the fluid 3D web experiences are built by wizard Mark Larat.',
      'I’ve included both version one and two of the marketing site. What’s interesting is that version one is actually what we wanted to launch from day one — we just didn’t have the capability yet. There’s about a year between them, and you can really see the progression.',
      'This company was honestly a dream. I had to step away because I promised my family I’d work less. But I loved every part of it — from the mechanical details of the watches to packaging and all the small accessories around it.',
      'Hope you like it.',
    ],
  },
  'off-market': {
    src: offmarketStoryUrl,
    fallbackDuration: 150,
    durationLabel: '02:30',
    ariaName: 'Off Market',
    title: 'My personal notes on Off Market',
    body: [
      'In 2015, I was in San Francisco working with Lever when I saw in a newspaper that Hans — a well-known luxury real estate agent in Oslo — was starting a new company.',
      'I’ve always been fascinated by both luxury products and real estate, so I immediately thought: I really want to work with this guy. This was one of the very few times I’ve actually reached out to someone specifically because I wanted to work with them.',
      'I never heard back.',
      'But about a month later, I got a phone call from Miriam at Scandinavian Design Group in Oslo. They had landed the project of designing a website for a new luxury real estate company.',
      'The second she mentioned it, I remember thinking: “Wait… is this Hans?”',
      'And she was like, “Yeah — how do you know?”',
      'I tried to play it cool and said I was just guessing.',
      'They needed someone to help lead the digital side of the project, and that’s how I got involved. I got to do what I enjoy the most — translating a brand and identity into a digital experience.',
      'Through that collaboration, Hans came to me with an idea.',
      'The real estate market in Norway is extremely transactional. Most people only have a short period where they’re actively searching, and because people gradually move up the ladder — apartment, bigger apartment, house — there’s this constant cycle of buying and selling.',
      'So we started asking ourselves:',
      'What if your home was always quietly on the market?',
      'And if someone offered the right price, you could decide to move.',
      'We started in the high-end segment, back when homes above 10 million NOK were considered luxury.',
      'One of the biggest insights we had was that buyers at that level often aren’t driven by photography first. They care more about location, architecture, privacy, size, renovation level — things like that.',
      'So instead of building a traditional listing platform, we designed a stripped-back experience centered around a map. You could quietly list your home, define what you were looking for, and connect directly with owners if there was mutual interest.',
      'We got really good traction with it and learned a ton. This was also back when Facebook advertising worked unbelievably well, so we were able to build both supply and demand surprisingly efficiently.',
      'This was honestly my first real experience building a company from scratch — everything from hiring and contracts to fundraising and shareholder agreements.',
      'Super fun project, and one I’m still very grateful for.',
    ],
  },

}

function projectAudioHtml(singleCase) {
  const audio = projectAudio[singleCase.id]
  if (!audio) return ''

  const transcriptId = `${singleCase.id}-transcript-title`
  const transcriptBody = audio.body.map((paragraph) => `<p>${escapeHtmlText(paragraph).replaceAll('\n', '<br />')}</p>`).join('\n          ')

  return `<div class="project-audio${audio.src ? '' : ' project-audio--text-only'}">
    <p class="project-audio__title" id="${singleCase.id}-story-label">Personal notes</p>
    <div class="project-audio__actions" role="group" aria-labelledby="${singleCase.id}-story-label">
    ${audio.src ? `<button
      class="project-audio__action project-audio__player"
      type="button"
      data-project-audio-button
      aria-label="Listen to the personal story about ${escapeAttr(audio.ariaName)}"
      aria-pressed="false"
    >
      <span class="project-audio__toggle" aria-hidden="true">
        <img class="project-audio__toggle-icon project-audio__toggle-icon--play" src="${headphonesIconUrl}" alt="" width="20" height="22" />
        <img class="project-audio__toggle-icon project-audio__toggle-icon--pause" src="${pauseIconUrl}" alt="" width="20" height="20" />
      </span>
      <span class="project-audio__label" data-audio-label>Listen</span>
      <span class="project-audio__duration" data-audio-time aria-hidden="true">${audio.durationLabel}</span>
    </button>` : ''}
    <button class="project-audio__action project-audio__transcript-trigger" type="button" data-transcript-open aria-haspopup="dialog" aria-label="Read the personal story about ${escapeAttr(audio.ariaName)}">
      <img class="project-audio__icon" src="${readIconUrl}" alt="" width="20" height="20" aria-hidden="true" />
      <span class="project-audio__label">Read</span>
    </button>
    </div>
    <p class="project-audio__status" data-audio-status role="status" aria-live="polite" aria-atomic="true"></p>
    ${audio.src ? `<audio data-project-audio data-audio-title="${escapeAttr(audio.ariaName)}" data-audio-fallback-duration="${audio.fallbackDuration}" src="${audio.src}" preload="none"></audio>` : ''}
    <dialog class="project-transcript-modal" data-transcript-modal aria-labelledby="${transcriptId}">
      <button class="project-transcript-modal__close" type="button" data-transcript-close aria-label="Close transcript">
        <img class="project-transcript-modal__close-icon" src="${closeIconUrl}" alt="" width="20" height="20" aria-hidden="true" />
      </button>
      <div class="project-transcript-modal__content">
        <p id="${transcriptId}" class="project-transcript-modal__heading"><img src="/images/personal-notes.png" alt="${escapeAttr(audio.title)}" width="1699" height="337" /></p>
        <div class="project-transcript-modal__body">
          ${transcriptBody}
        </div>
      </div>
    </dialog>
  </div>`
}

/**
 * Pair consecutive `half` items into one row, `third` items into rows of three;
 * `full` spans the grid.
 */
function layoutRows(items) {
  /** @type {{ kind: 'full' | 'half-row' | 'third-row', items: typeof items }[]} */
  const rows = []
  let buf = []
  let bufKind = null
  const flush = () => {
    if (buf.length) rows.push({ kind: bufKind === 'third' ? 'third-row' : 'half-row', items: [...buf] })
    buf = []
    bufKind = null
  }
  for (const item of items) {
    if (item.span === 'half' || item.span === 'third') {
      if (bufKind && bufKind !== item.span) flush()
      bufKind = item.span
      buf.push(item)
      if (buf.length === (item.span === 'third' ? 3 : 2)) flush()
    } else {
      flush()
      rows.push({ kind: 'full', items: [item] })
    }
  }
  flush()
  return rows
}

function caseSection(singleCase) {
  const rows = layoutRows(singleCase.items)
  const blocks = rows.map((row, rowIndex) => {
    /* Første rad er LCP — lastes eagert med høy prioritet; resten forblir lazy. */
    const eager = rowIndex === 0
    if (row.kind === 'full') {
      if (row.items[0].type === 'comparison') return comparisonHtml(row.items[0])
      if (row.items[0].type === 'gallery') return galleryHtml(row.items[0])
      if (row.items[0].type === 'text') return `<div class="case-story work-narrow"><p>${escapeHtmlText(row.items[0].text)}</p></div>`
      if (row.items[0].type === 'tabs') return tabsHtml(row.items[0])
      if (row.items[0].type === 'logo-morph') return logoMorphHtml()
      return wrapFigure(row.items[0], eager)
    }
    if (row.kind === 'third-row') {
      /* Triptyk: alltid tre i bredden — hører sammen som ett motiv. */
      const cells = row.items
        .map((item) => `<div class="portfolio-third min-w-0">${wrapFigure(item, eager)}</div>`)
        .join('')
      return `<div class="w-full">
        <div class="case-media-grid grid grid-cols-3">${cells}</div>
      </div>`
    }
    const cells = row.items
      .map((item) => `<div class="portfolio-half min-w-0">${wrapFigure(item, eager)}</div>`)
      .join('')
    return `<div class="w-full">
      <div class="case-media-grid grid grid-cols-1 md:grid-cols-2">${cells}</div>
    </div>`
  })

  /* Første bilde øverst; tittel, intro og lydspiller under det; så resten av mediene.
     (Case uten media ennå → tom hero-wrapper, kun tittel/intro.) */
  const [firstBlock = '', ...restBlocks] = blocks

  if (singleCase.layout === 'split') {
    return `<section id="${singleCase.id}" class="case-layout-split scroll-mt-24 pt-8" aria-labelledby="title-${singleCase.id}">
      <div class="work-media case-lead"${singleCase.keepCoverInPresentation ? ' data-keep-cover' : ''}>
        <div class="case-lead__copy case-below">
          <h1 id="title-${singleCase.id}" class="case-lead__title">${escapeHtmlText(singleCase.displayTitle ?? singleCase.title)}</h1>
          <p class="case-lead__intro">${escapeHtmlText(singleCase.intro)}</p>
          ${creditsHtml(singleCase)}
          ${titleBlockHtml(singleCase)}
        </div>
        <div class="case-cover-hero">${firstBlock}</div>
      </div>
      <div class="case-below work-media mt-10 case-media-stack flex flex-col">${restBlocks.join('\n')}</div>
    </section>`
  }

  return `<section id="${singleCase.id}" class="scroll-mt-24 pt-8" aria-labelledby="title-${singleCase.id}">
    <div class="case-legacy-lead">
    <div class="work-media case-cover-hero case-media-stack flex flex-col">${firstBlock}</div>
    <div class="case-legacy-copy case-below work-narrow mt-10 mb-8 w-full md:mt-14">
      <h2 id="title-${singleCase.id}" class="case-legacy-title font-label text-center text-xl font-semibold uppercase tracking-tight text-zinc-900 md:text-2xl">${singleCase.title}</h2>
      <p class="case-legacy-intro mt-2 text-center text-sm leading-relaxed text-zinc-600 md:text-base">${singleCase.intro}</p>
      ${creditsHtml(singleCase)}
      ${titleBlockHtml(singleCase)}
    </div>
    </div>
    <div class="case-below work-media case-media-stack flex flex-col">${restBlocks.join('\n')}</div>
  </section>`
}

export function buildCaseHtml(caseId) {
  const singleCase = portfolioCases.find((c) => c.id === caseId)
  if (!singleCase) return ''
  return caseSection(singleCase) + projectAudioHtml(singleCase)
}
