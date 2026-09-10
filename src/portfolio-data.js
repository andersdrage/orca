/** @typedef {{ file: string, alt?: string, caption?: string }} MediaItem */

/**
 * Dedicated case studies; archived-only projects live in archived-grid.js.
 * `span` matches filename: full | half
 * `caption` – valgfri kort tekst under bildet/video (10px, sentrert, zinc-600)
 */
/* Cover-varianter for MICROMILSPEC: B-tasten på FORSIDEN sykler tilen gjennom
   disse. Valget lagres i sessionStorage ('micromilspec:cover'), og case-heroen
   følger etter ved åpning — morphen forblir én og samme flate.
   ratio må matche bildefilens faktiske aspekt. */
export const micromilspecCovers = [
  /* Hvit/oransje er hovedcoveret; B sykler videre til tegningen og den sorte. */
  { file: 'andersdrage-micromilspec-hero.jpg', ratio: '1331 / 2000' },
  { file: 'andersdrage-micromilspec-cover-alternative-2.jpg', ratio: '1600 / 1770' },
  { file: 'andersdrage-micromilspec-cover-alternative-3.jpg', ratio: '1510 / 2000' },
]

export const portfolioCases = [
  {
    id: 'houeland',
    year: '2026',
    title: 'Houeland',
    keepCoverInPresentation: true,
    layout: 'split',
    intro: 'Houeland sells Norway’s most extraordinary homes. I helped them going from 0 to 1 – shaping the name, strategy, visual identity, imagery and copy.',
    credits: [
      { role: 'Creative director', names: 'Anders Drage' },
      { role: 'Website', names: 'Thomas Larsen' },
      { role: 'Founder', names: 'Hans Houeland' },
      { role: 'Advisor', names: 'Tove Spetalen' },
    ],
    items: [
      { file: 'andersdrage-houeland-001.mp4', span: 'full', alt: 'Houeland website walkthrough' },
      { file: 'andersdrage-houeland-002.jpg', span: 'full', alt: 'Houeland — green and gold seal for selected properties' },
      { file: 'andersdrage-houeland-003.jpg', span: 'full', alt: 'Houeland — embossed seal on soap in a marble dish' },
      { file: 'andersdrage-houeland-004.jpg', span: 'full', alt: 'Houeland — app icon on an iPhone home screen' },
      { file: 'andersdrage-houeland-005.jpg', span: 'full', alt: 'Houeland — textured business cards for Hans Houeland' },
      { file: 'andersdrage-houeland-006.jpg', span: 'full', alt: 'Houeland — brand color palette' },
      { file: 'andersdrage-houeland-007.jpg', span: 'full', alt: 'Houeland — typography and property listing copy' },
    ],
  },
  {
    id: 'micromilspec',
    year: '2019–2024',
    title: 'MICROMILSPEC',
    displayTitle: 'Micromilspec',
    separateCreditRoles: ['Development'],
    layout: 'split',
    intro:
      'Co-built the brand, product, and operations — scaling to ~40 MNOK in sales across bespoke and military projects in three years.',
    credits: [
      { role: 'Co-founder', names: 'Henrik Rye' },
      { role: 'Co-founder', names: 'Martin S' },
      { role: 'Development', names: 'Kim Ellefsen' },
      { role: '3D', names: 'Alexander Kadim' },
      { role: 'Creative Director', names: 'Anders Drage' },
    ],
    items: [
      /* Hero = samme bilde som tidslinje-tilen — morphen lander sømløst i seg selv. */
      { file: 'andersdrage-micromilspec-hero.jpg', span: 'full', alt: 'MICROMILSPEC' },
      { file: 'andersdrage-micromilspec-001.mp4', span: 'full', alt: 'MICROMILSPEC' },
      { file: 'andersdrage-micromilspec-002.jpg', span: 'half', alt: 'MICROMILSPEC' },
      { file: 'andersdrage-micromilspec-003.jpg', span: 'half', alt: 'MICROMILSPEC' },
      { file: 'andersdrage-micromilspec-004.jpg', span: 'full', alt: 'MICROMILSPEC' },
      { file: 'andersdrage-micromilspec-005.mp4', span: 'half', alt: 'MICROMILSPEC' },
      { file: 'andersdrage-micromilspec-006.jpg', span: 'half', alt: 'MICROMILSPEC' },
      { file: 'andersdrage-micromilspec-007.mp4', span: 'full', alt: 'MICROMILSPEC' },
      { file: 'andersdrage-micromilspec-008.jpg', span: 'half', alt: 'MICROMILSPEC' },
      { file: 'andersdrage-micromilspec-009.jpg', span: 'half', alt: 'MICROMILSPEC' },
      { file: 'andersdrage-micromilspec-010.jpg', span: 'full', alt: 'MICROMILSPEC' },
    ],
  },
  {
    id: 'hjemla',
    year: '2023',
    title: 'Hjemla',
    layout: 'split',
    intro:
      'Redesigned the identity and product for Hjemla, an internal startup at Boligmappa — turning cold property data into a warm, welcoming home for every home.',
    credits: [
      { role: 'Product owner', names: 'Michael Slettjord Wik' },
      { role: 'Business', names: 'Håvard Heggem von Krogh' },
      { role: 'Marketing', names: 'Eirik Vigeland' },
      { role: 'Design', names: 'Gjermund Gustavsen' },
      { role: 'Creative director', names: 'Anders Drage' },
      { role: 'Developer', names: 'Nikita' },
    ],
    items: [
      { file: 'andersdrage-hjemla-hero.jpg', span: 'full', alt: 'Hjemla' },
      { file: 'andersdrage-hjemla-001.jpg', span: 'full', alt: 'Hjemla' },
      { file: 'andersdrage-hjemla-002.jpg', span: 'full', alt: 'Hjemla' },
      { file: 'andersdrage-hjemla-003.jpg', span: 'full', alt: 'Hjemla' },
      { file: 'andersdrage-hjemla-004.jpg', span: 'full', alt: 'Hjemla' },
      { file: 'andersdrage-hjemla-005.jpg', span: 'full', alt: 'Hjemla' },
    ],
  },
  {
    id: 'off-market',
    year: '2017–2018',
    title: 'Off Market',
    layout: 'split',
    intro:
      'Co-founded Off Market, a real-estate marketplace matching buyers and sellers before homes reached the open market — leading product, design, and marketing.',
    credits: [
      { role: 'Co-founder', names: 'Hans Houeland' },
      { role: 'CTO', names: 'Kim Ellefsen' },
      { role: 'Design', names: 'Simon Bognø' },
      { role: 'Illustrations', names: 'Andrew Nye' },
    ],
    items: [
      /* Hero = samme cover som tidslinje-tilen. */
      { file: 'andersdrage-off-market-hero.jpg', span: 'full', alt: 'Off Market' },
      { file: 'andersdrage-off-market-001.jpg', span: 'full', alt: 'Off Market' },
      { file: 'andersdrage-off-market-002.jpg', span: 'full', alt: 'Off Market' },
      { file: 'andersdrage-off-market-003.jpg', span: 'full', alt: 'Off Market' },
      { file: 'andersdrage-off-market-004.jpg', span: 'full', alt: 'Off Market' },
      { file: 'andersdrage-off-market-005.jpg', span: 'full', alt: 'Off Market' },
      { file: 'andersdrage-off-market-006.jpg', span: 'full', alt: 'Off Market' },
      { file: 'andersdrage-off-market-007.mp4', span: 'full', alt: 'Off Market' },
      { file: 'andersdrage-off-market-008.jpg', span: 'full', alt: 'Off Market' },
    ],
  },
  {
    id: 'nettavisen',
    year: '2019',
    title: 'Nettavisen',
    intro:
      'Led an embedded design team through Nettavisen’s rebrand and product redesign — working in short sprints and testing with readers to better reflect the quality of its journalism and challenge its tabloid reputation.',
    credits: [
      { role: 'Creative Director', names: 'Anders Drage' },
      { role: 'Designers', names: 'Fredrik Lien Bjørgmo, Line Rosvoll Holmen, Neno Mindjek' },
      { role: 'Strategy & client director', names: 'Jonas Feiring' },
      { role: 'Client', names: 'Pål Nisja' },
      { role: 'Custom typeface', names: 'Frode Helland / Monokrom' },
    ],
    items: [
      /* Cover is retained for the index; presentation starts with the overview below. */
      { file: 'andersdrage-nettavisen-hero.jpg', span: 'full', alt: 'Nettavisen' },
      // Preserve the original image bytes; only the case order changes.
      { file: 'andersdrage-nettavisen-001.jpg', span: 'full', alt: 'Nettavisen digital design overview' },
      { file: 'andersdrage-nettavisen-002.jpg', span: 'full', alt: 'Yellow Nettavisen campaign poster in a station' },
      { file: 'andersdrage-nettavisen-003.mp4', span: 'full', alt: 'Nettavisen' },
      { file: 'andersdrage-nettavisen-004.png', span: 'full', alt: 'Nettavisen mobile economy pages and blue story cards' },
      { file: 'andersdrage-nettavisen-005.png', span: 'full', alt: 'Nettavisen redesigned desktop homepage' },
      { file: 'andersdrage-nettavisen-006.png', span: 'full', alt: 'Nettavisen section identities and colorful headline treatments' },
      { file: 'andersdrage-nettavisen-007.png', span: 'full', alt: 'Nettavisen advertising and vertical brand campaigns' },
      { file: 'andersdrage-nettavisen-008.png', span: 'full', alt: 'Nettavisen news section with breaking-news headlines' },
      { file: 'andersdrage-nettavisen-009.png', span: 'full', alt: 'Nettavisen economy section homepage' },
      { file: 'andersdrage-nettavisen-010.png', span: 'full', alt: 'Nettavisen video section with a dark background' },
      { file: 'andersdrage-nettavisen-011.png', span: 'full', alt: 'Nettavisen editorial layouts and highlighted stories' },
      { file: 'andersdrage-nettavisen-012.png', span: 'full', alt: 'Nettavisen economy article headline and photography' },
      { file: 'andersdrage-nettavisen-013.png', span: 'full', alt: 'Nettavisen Pluss feature article with serif typography' },
      { file: 'andersdrage-nettavisen-014.png', span: 'full', alt: 'Nettavisen reader letters and opinion article layout' },
      { file: 'andersdrage-nettavisen-015.png', span: 'full', alt: 'Nettavisen mobile article and economy layouts' },
      { file: 'andersdrage-nettavisen-016.png', span: 'full', alt: 'Nettavisen mobile sports pages and green score cards' },
      { file: 'andersdrage-nettavisen-017.png', span: 'full', maxWidth: 400, alt: 'Nettavisen dimensional sign above the office entrance' },
    ],
  },
  {
    id: 'finn',
    year: '2016',
    title: 'FINN.no',
    intro:
      'Helped shape a new visual identity and future vision for FINN.no at Brandlab — a design language that has lasted over a decade and connects everything from digital experiences and advertising to physical office spaces.',
    credits: [
      { role: 'Creative Director', names: 'Miriam Skovholt Mortensen' },
      { role: 'Designers', names: 'Anders Drage, Ludvig Bruneau Rossow and Truong Vu Pham' },
      { role: 'Strategy', names: 'Monna Nordhagen, Kirsti Rogne, Jonas Feiring' },
      { role: 'Project management', names: 'Caroline Hanssen' },
      { role: 'Custom typeface', names: 'Letters from Sweden' },
    ],
    items: [
      /* Index cover stays hidden in presentation; case media starts with the iMac. */
      { file: 'andersdrage-finn-hero.jpg', span: 'full', alt: 'FINN.no' },
      { file: 'andersdrage-finn-001.jpg', span: 'full', alt: 'FINN.no homepage concept on an iMac' },
      { type: 'logo-morph', span: 'full' },
      { file: 'andersdrage-finn-002.mp4', span: 'full', alt: 'FINN.no case film' },
      { file: 'andersdrage-finn-003.jpg', span: 'full', alt: 'FINN.no' },
      /* Kort type-vekt-animasjon (0,75s) — looper som syklende specimen. */
      { file: 'andersdrage-finn-004.mp4', span: 'full', alt: 'FINN.no typography weights' },
      { file: 'andersdrage-finn-005.jpg', span: 'half', alt: 'FINN.no' },
      { file: 'andersdrage-finn-006.jpg', span: 'half', alt: 'FINN.no' },
      { file: 'andersdrage-finn-007.jpg', span: 'full', alt: 'FINN.no' },
      { file: 'andersdrage-finn-008.jpg', span: 'half', alt: 'FINN.no' },
      { file: 'andersdrage-finn-009.jpg', span: 'half', alt: 'FINN.no' },
      { file: 'andersdrage-finn-010.jpg', span: 'full', alt: 'FINN.no' },
      { file: 'andersdrage-finn-011.jpg', span: 'half', alt: 'FINN.no' },
      { file: 'andersdrage-finn-012.png', span: 'half', alt: 'FINN.no' },
      { file: 'andersdrage-finn-013.jpg', span: 'full', alt: 'FINN.no' },
      { file: 'andersdrage-finn-014.jpg', span: 'half', alt: 'FINN.no' },
      { file: 'andersdrage-finn-015.jpg', span: 'half', alt: 'FINN.no' },
      { file: 'andersdrage-finn-016.jpg', span: 'full', alt: 'FINN.no' },
      { file: 'andersdrage-finn-017.jpg', span: 'full', alt: 'FINN.no mobile chat and iPad editorial concepts' },
      { file: 'andersdrage-finn-018.jpg', span: 'full', alt: 'FINN.no visual identity across desktop, tablet and mobile' },
      /* Office photographs close the case, in the original 1–6 order. */
      { file: 'andersdrage-finn-019.jpg', span: 'half', alt: 'FINN-branded cushion with colorful geometric shapes' },
      { file: 'andersdrage-finn-020.jpg', span: 'half', alt: 'FINN meeting rooms with illustrated glass walls' },
      { file: 'andersdrage-finn-021.jpg', span: 'half', alt: 'Blue FINN illustration wall beneath a sloping office roof' },
      { file: 'andersdrage-finn-022.jpg', span: 'half', alt: 'FINN office interior with colorful chairs and illustrated partitions' },
      { file: 'andersdrage-finn-023.jpg', span: 'half', alt: 'FINN glass doors decorated with geometric frames and animal photographs' },
      { file: 'andersdrage-finn-024.jpg', span: 'half', alt: 'FINN sign above a red wall-mounted coat rack' },
    ],
  },
  {
    id: 'uber',
    year: '2015',
    title: 'Uber',
    intro:
      'Helped redesign Uber’s global website alongside Ueno and Uber’s in-house design team — creating a friendlier digital presence and a flexible design system spanning thousands of pages.',
    credits: [
      { role: 'Creative Director', names: 'Haraldur Thorleifsson' },
      { role: 'Designers', names: 'Ben Mingo, Robin Noguier, Jenny Johannesson and Anders Drage' },
      { role: 'Illustrations and icons', names: 'Stout Design' },
      { role: 'Uber', names: 'Shalin Amin and Strahan McMullen' },
    ],
    items: [
      /* Hero = samme cover som tidslinje-tilen; videoen under. */
      { file: 'andersdrage-uber-hero.jpg', span: 'full', alt: 'Uber' },
      { file: 'andersdrage-uber-001.mp4', span: 'full', alt: 'Uber' },
      {
        type: 'text', span: 'full',
        text: 'We helped move Uber from all black to a friendlier, more colorful world, with a global design system full of local character. City pages came alive through language, color, patterns and Stout’s illustrations of cities around the world. The scale of that work still amazes me. It was my first time designing for right-to-left reading—a fascinating challenge. And I loved “the bit”: a little square that gave the main call to action a home, always there to show you the way.',
      },
      {
        type: 'tabs', span: 'full', id: 'uber-countries', label: 'Uber around the world',
        heading: 'A design system across borders',
        description: 'Explore how it looks locally',
        width: 1290, height: 762,
        tabs: [
          { file: 'andersdrage-uber-002.jpg', label: 'China' },
          { file: 'andersdrage-uber-003.jpg', label: 'France' },
          { file: 'andersdrage-uber-004.jpg', label: 'India' },
          { file: 'andersdrage-uber-005.jpg', label: 'Ireland' },
          { file: 'andersdrage-uber-006.jpg', label: 'Mexico' },
          { file: 'andersdrage-uber-007.jpg', label: 'Morocco' },
          { file: 'andersdrage-uber-008.jpg', label: 'Netherlands' },
          { file: 'andersdrage-uber-009.jpg', label: 'Singapore' },
          { file: 'andersdrage-uber-010.jpg', label: 'USA' },
          { file: 'andersdrage-uber-011.jpg', label: 'Australia' },
        ],
      },
      /* Fra Ueno sin case-studie av uber.com (web.archive.org, 2021-01-14). */
      { file: 'andersdrage-uber-012.mp4', span: 'full', alt: 'Uber' },
      { file: 'andersdrage-uber-013.mp4', span: 'full', alt: 'Uber' },
      {
        type: 'gallery', span: 'full', label: 'Uber website pages',
        images: [
          { file: 'andersdrage-uber-014.jpg', alt: 'City' },
          { file: 'andersdrage-uber-015.jpg', alt: 'Rider' },
          { file: 'andersdrage-uber-016.jpg', alt: 'Wheel' },
          { file: 'andersdrage-uber-017.jpg', alt: 'Careers' },
          { file: 'andersdrage-uber-018.jpg', alt: 'Careers — job details' },
        ],
      },
    ],
  },
  {
    id: 'boligmappa',
    year: '2024',
    title: 'Boligmappa',
    intro:
      'Led the rebrand of Boligmappa, a home documentation platform serving 1.2 million homeowners — redesigning its marketing website and logged-in experience.',
    credits: [
      { role: 'Creative director', names: 'Anders Drage' },
      { role: 'Marketing', names: 'Eirik Vigeland' },
      { role: 'Product owner', names: 'Martin Lampe' },
      { role: 'Development', names: 'Christopher Einarsrud' },
    ],
    items: [
      /* Hero = samme cover som tidslinje-tilen (duell-vinneren: to telefoner). */
      { file: 'andersdrage-boligmappa-hero.jpg', span: 'full', alt: 'Boligmappa' },
      { file: 'andersdrage-boligmappa-001.jpeg', span: 'full', alt: 'Boligmappa — redesigned website on desktop and mobile' },
      {
        type: 'comparison', span: 'full', label: 'Boligmappa website before and after',
        before: { file: 'andersdrage-boligmappa-002.jpeg', alt: 'Boligmappa website before the redesign' },
        after: { file: 'andersdrage-boligmappa-003.jpeg', alt: 'Boligmappa website after the redesign' },
      },
      { file: 'andersdrage-boligmappa-004.jpeg', span: 'full', alt: 'Boligmappa — illustrated error page' },
      { file: 'andersdrage-boligmappa-005.jpeg', span: 'full', alt: 'Boligmappa — evolution of the folder logo' },
      { file: 'andersdrage-boligmappa-006.jpeg', span: 'full', alt: 'Boligmappa — visual identity across digital design, illustration and merchandise' },
      { file: 'andersdrage-boligmappa-007.jpeg', span: 'full', alt: 'Boligmappa — visual identity guidelines' },
      { file: 'andersdrage-boligmappa-008.webp', span: 'full', alt: 'Boligmappa — home documentation on a phone beside a cup of coffee' },
      { file: 'andersdrage-boligmappa-009.webp', span: 'full', alt: 'Boligmappa — Norges vakreste bolig billboard' },
      { file: 'andersdrage-boligmappa-010.webp', span: 'full', alt: 'Boligmappa — brand presentation on a conference screen' },
    ],
  },
]
