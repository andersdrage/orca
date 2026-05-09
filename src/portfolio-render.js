import { portfolioCases } from './portfolio-data.js'
import micromilspecStoryUrl from './micromilspec-story.mp3?url'
import miscWorkUrl from './misc-work.mp3?url'
import offmarketStoryUrl from './offmarket-story.mp3?url'
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

const projectAudio = {
  micromilspec: {
    src: micromilspecStoryUrl,
    fallbackDuration: 141,
    durationLabel: '02:21',
    ariaName: 'MICROMILSPEC',
    title: 'My personal notes on the project',
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
  misc: {
    src: miscWorkUrl,
    fallbackDuration: 86,
    durationLabel: '01:26',
    ariaName: 'Selected work',
    title: 'My personal notes on selected work',
    body: [
      'The last part of my portfolio is more of a collection of fragments from different client projects, startups, and side quests over the years.',
      'Some of it comes from my time in San Francisco. At one point, Halli — an incredibly well-known designer — randomly DM’d me on Twitter and asked if I wanted to stop by the office. Little did I know that would extend my stay in San Francisco by another three weeks.',
      'That eventually led to me contributing to one of the highest-profile projects I’ve ever worked on: the Uber redesign back in 2016, during the peak of the company’s growth.',
      'The level of talent on that project was honestly intimidating. I remember sitting in meetings almost afraid to say anything, because everyone around the table was just unbelievably good.',
      'The work shown here ranges from projects like that all the way to helping a group of people start a bank in Oslo.',
      'There’s also work from Brevio, another startup I was involved in within the audit industry, where I worked a lot on systems design. You’ll also see work for Finn, the Nettavisen redesign, some Nike work that came out of connections from San Francisco, a collection of logos, and Pressworks — a platform I genuinely loved working on together with a great founder named Christian.',
      'So this section is really a mix of different things I’ve been fortunate enough to work on over the years.',
      'If there’s anything you’re curious about, feel free to reach out.',
    ],
  },
}

function projectAudioHtml(singleCase) {
  const audio = projectAudio[singleCase.id]
  if (!audio) return ''

  const transcriptId = `${singleCase.id}-transcript-title`
  const transcriptBody = audio.body.map((paragraph) => `<p>${escapeHtmlText(paragraph)}</p>`).join('\n          ')

  return `<span class="project-audio__sentinel" data-project-audio-sentinel aria-hidden="true"></span>
  <div class="project-audio mt-5">
    <button
      class="project-audio__player"
      type="button"
      data-project-audio-button
      aria-label="Play audio story about ${escapeAttr(audio.ariaName)}"
      aria-pressed="false"
    >
      <img class="project-audio__headphones" src="${headphonesIconUrl}" alt="" width="20" height="22" aria-hidden="true" />
      <span class="project-audio__label" data-audio-label>Personal notes on the project</span>
      <span class="project-audio__duration" data-audio-time>${audio.durationLabel}</span>
      <span class="project-audio__toggle" aria-hidden="true">
        <img class="project-audio__toggle-icon project-audio__toggle-icon--play" src="${playIconUrl}" alt="" width="20" height="20" />
        <img class="project-audio__toggle-icon project-audio__toggle-icon--pause" src="${pauseIconUrl}" alt="" width="20" height="20" />
      </span>
    </button>
    <button class="project-audio__transcript-trigger" type="button" data-transcript-open>
      Read notes
    </button>
    <audio data-project-audio data-audio-title="${escapeAttr(audio.ariaName)}" data-audio-fallback-duration="${audio.fallbackDuration}" src="${audio.src}" preload="metadata"></audio>
    <dialog class="project-transcript-modal" data-transcript-modal aria-labelledby="${transcriptId}">
      <button class="project-transcript-modal__close" type="button" data-transcript-close aria-label="Close transcript">
        <img class="project-transcript-modal__close-icon" src="${closeIconUrl}" alt="" width="20" height="20" aria-hidden="true" />
      </button>
      <div class="project-transcript-modal__content">
        <p id="${transcriptId}" class="project-transcript-modal__eyebrow">${escapeHtmlText(audio.title)}</p>
        <div class="project-transcript-modal__body">
          ${transcriptBody}
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
