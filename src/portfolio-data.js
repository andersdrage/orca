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
  { file: 'micromilspec-cover-white.jpg', ratio: '1331 / 2000' },
  { file: 'micromilspec-6-half.jpg', ratio: '1600 / 1770' },
  { file: 'micromilspec-cover-black.jpg', ratio: '1510 / 2000' },
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
      { file: 'houeland-web.mp4', span: 'full', alt: 'Houeland website walkthrough' },
      { file: 'houeland-1.jpg', span: 'full', alt: 'Houeland — green and gold seal for selected properties' },
      { file: 'houeland-2.jpg', span: 'full', alt: 'Houeland — embossed seal on soap in a marble dish' },
      { file: 'houeland-3.jpg', span: 'full', alt: 'Houeland — app icon on an iPhone home screen' },
      { file: 'houeland-4.jpg', span: 'full', alt: 'Houeland — textured business cards for Hans Houeland' },
      { file: 'houeland5.jpg', span: 'full', alt: 'Houeland — brand color palette' },
      { file: 'houeland-6.jpg', span: 'full', alt: 'Houeland — typography and property listing copy' },
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
      { role: 'Development', names: 'Mark Larratt' },
      { role: '3D', names: 'Alexander Kadim' },
      { role: 'Creative Director', names: 'Anders Drage' },
    ],
    items: [
      /* Hero = samme bilde som tidslinje-tilen — morphen lander sømløst i seg selv. */
      { file: 'micromilspec-cover-white.jpg', span: 'full', alt: 'MICROMILSPEC' },
      { file: 'micromilspec-1-full.mp4', span: 'full', alt: 'MICROMILSPEC' },
      { file: 'micromilspec-3-half.jpg', span: 'half', alt: 'MICROMILSPEC' },
      { file: 'micromilspec-4-half.jpg', span: 'half', alt: 'MICROMILSPEC' },
      { file: 'micromilspec-5-full.jpg', span: 'full', alt: 'MICROMILSPEC' },
      { file: 'micromilspec-7-half.mp4', span: 'half', alt: 'MICROMILSPEC' },
      { file: 'micromilspec-8-half.jpg', span: 'half', alt: 'MICROMILSPEC' },
      { file: 'micromilspec-2-full.mp4', span: 'full', alt: 'MICROMILSPEC' },
      { file: 'micromilspec-9-half.jpg', span: 'half', alt: 'MICROMILSPEC' },
      { file: 'micromilspec-10-half.jpg', span: 'half', alt: 'MICROMILSPEC' },
      { file: 'micromilspec-11-half.jpg', span: 'full', alt: 'MICROMILSPEC' },
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
      { file: 'hjemla-1-full.jpg', span: 'full', alt: 'Hjemla' },
      { file: 'hjemla-2-full.jpg', span: 'full', alt: 'Hjemla' },
      { file: 'hjemla-3-full.jpg', span: 'full', alt: 'Hjemla' },
      { file: 'hjemla-4-full.jpg', span: 'full', alt: 'Hjemla' },
      { file: 'hjemla-5-full.jpg', span: 'full', alt: 'Hjemla' },
      { file: 'hjemla-6-full.jpg', span: 'full', alt: 'Hjemla' },
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
      { file: 'offmarket-cover-1.jpg', span: 'full', alt: 'Off Market' },
      { file: 'offmarket-1-full.jpg', span: 'full', alt: 'Off Market' },
      { file: 'offmarket-2-full.jpg', span: 'full', alt: 'Off Market' },
      { file: 'offmarket-3-full.jpg', span: 'full', alt: 'Off Market' },
      { file: 'offmarket-4-full.jpg', span: 'full', alt: 'Off Market' },
      { file: 'offmarket-5-full.jpg', span: 'full', alt: 'Off Market' },
      { file: 'offmarket-6-full.jpg', span: 'full', alt: 'Off Market' },
      { file: 'offmarket-7-full.mp4', span: 'full', alt: 'Off Market' },
      { file: 'offmarket-8-full.jpg', span: 'full', alt: 'Off Market' },
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
      /* Hero = samme cover som tidslinje-tilen. */
      { file: 'nettavisen-cover.jpg', span: 'full', alt: 'Nettavisen' },
      { file: 'na-03.mp4', span: 'full', alt: 'Nettavisen' },
      { file: 'misc-nettavisen.jpg', span: 'full', alt: 'Nettavisen digital design overview' },
      // Original image bytes from https://www.mindjek.com/projects/na.html; keep uncompressed.
      { file: 'nettavisen-mindjek-02.png', span: 'full', alt: 'Nettavisen redesigned desktop homepage' },
      { file: 'nettavisen-mindjek-07.png', span: 'full', alt: 'Nettavisen visual identity, headlines and editorial components' },
      { file: 'nettavisen-mindjek-08.png', span: 'full', alt: 'Nettavisen section identities and colorful headline treatments' },
      { file: 'nettavisen-mindjek-09.png', span: 'full', alt: 'Nettavisen news section with breaking-news headlines' },
      { file: 'nettavisen-mindjek-10.png', span: 'full', alt: 'Nettavisen economy section homepage' },
      { file: 'nettavisen-mindjek-11.png', span: 'full', alt: 'Nettavisen opinion section homepage' },
      { file: 'nettavisen-mindjek-12.png', span: 'full', alt: 'Nettavisen video section with a dark background' },
      { file: 'nettavisen-mindjek-13.png', span: 'full', alt: 'Nettavisen editorial layouts and highlighted stories' },
      { file: 'nettavisen-mindjek-15.png', span: 'full', alt: 'Nettavisen economy article headline and photography' },
      { file: 'nettavisen-mindjek-16.png', span: 'full', alt: 'Nettavisen Pluss feature article with serif typography' },
      { file: 'nettavisen-mindjek-17.png', span: 'full', alt: 'Nettavisen article body and related stories' },
      { file: 'nettavisen-mindjek-18.png', span: 'full', alt: 'Nettavisen long-form article typography and reading layout' },
      { file: 'nettavisen-mindjek-19.png', span: 'full', alt: 'Nettavisen reader letters and opinion article layout' },
      { file: 'nettavisen-mindjek-21.png', span: 'full', alt: 'Nettavisen mobile article and economy layouts' },
      { file: 'nettavisen-mindjek-22.png', span: 'full', alt: 'Nettavisen mobile news and social story designs' },
      { file: 'nettavisen-mindjek-23.png', span: 'full', alt: 'Nettavisen mobile economy pages and blue story cards' },
      { file: 'nettavisen-mindjek-24.png', span: 'full', alt: 'Nettavisen mobile sports pages and green score cards' },
      { file: 'nettavisen-mindjek-25.png', span: 'full', alt: 'Nettavisen mobile lifestyle pages and purple story cards' },
      { file: 'nettavisen-mindjek-26.png', span: 'full', alt: 'Nettavisen advertising and vertical brand campaigns' },
      // Tumblr serves the supplied .png URL as a JPEG; saved unchanged in its actual format.
      { file: 'nettavisen-tumblr-overview.jpg', span: 'full', alt: 'Yellow Nettavisen campaign poster in a station' },
      { file: 'nettavisen-mindjek-01.png', span: 'full', maxWidth: 400, alt: 'Nettavisen dimensional sign above the office entrance' },
    ],
  },
  {
    id: 'finn',
    year: '2016',
    title: 'FINN.no',
    intro:
      'Helped shape a new visual identity and future vision for FINN.no at Brandlab — a design language that has evolved over a decade to connect everything from digital experiences and advertising to physical office spaces.',
    credits: [
      { role: 'Creative Director', names: 'Miriam Skovholt Mortensen' },
      { role: 'Designers', names: 'Anders Drage, Ludvig Bruneau Rossow and Truong Vu Pham' },
      { role: 'Strategy', names: 'Monna Nordhagen, Kirsti Rogne, Jonas Feiring' },
      { role: 'Project management', names: 'Caroline Hanssen' },
      { role: 'Reel', names: 'Lars Hoel' },
      { role: 'Custom typeface', names: 'Letters from Sweden' },
    ],
    items: [
      /* Hero = tile-cover; filmen som nr. 2 (autoplay, muted, loop). */
      { file: 'finn-5.jpg', span: 'full', alt: 'FINN.no' },
      { file: 'finn-film.mp4', span: 'full', alt: 'FINN.no case film' },
      /* Bilde 1–4 fra runde to høyt oppe. */
      { file: 'finn-10.jpg', span: 'full', alt: 'FINN.no' },
      { file: 'finn-11.jpg', span: 'half', alt: 'FINN.no' },
      { file: 'finn-12.jpg', span: 'half', alt: 'FINN.no' },
      { file: 'finn-13.jpg', span: 'full', alt: 'FINN.no' },
      /* Kort type-vekt-animasjon (0,75s) — looper som syklende specimen. */
      { file: 'finn-type-weights.mp4', span: 'full', alt: 'FINN.no typography weights' },
      { file: 'finn-1.jpg', span: 'half', alt: 'FINN.no' },
      { file: 'finn-2.jpg', span: 'half', alt: 'FINN.no' },
      { file: 'finn-3.jpg', span: 'full', alt: 'FINN.no' },
      { file: 'finn-4.jpg', span: 'half', alt: 'FINN.no' },
      { file: 'finn-6.jpg', span: 'half', alt: 'FINN.no' },
      { file: 'finn-7.jpg', span: 'full', alt: 'FINN.no' },
      { file: 'finn-8.jpg', span: 'half', alt: 'FINN.no' },
      { file: 'finn-9.png', span: 'half', alt: 'FINN.no' },
      { file: 'finn-14.jpg', span: 'full', alt: 'FINN.no' },
      { file: 'finn-15.jpg', span: 'half', alt: 'FINN.no' },
      { file: 'finn-16.jpg', span: 'half', alt: 'FINN.no' },
      { file: 'finn-17.jpg', span: 'full', alt: 'FINN.no' },
      { file: 'finn-18.jpg', span: 'full', alt: 'FINN.no' },
      { file: 'finn-home-imac-v1.jpg', span: 'full', alt: 'FINN.no homepage concept on an iMac' },
      { file: 'finn-property-viewing-v1.jpg', span: 'full', alt: 'FINN.no property viewing concept on a laptop' },
      { file: 'finn-chat-ipad-v1.jpg', span: 'full', alt: 'FINN.no mobile chat and iPad editorial concepts' },
      { file: 'finn-digital-overview-v1.jpg', span: 'full', alt: 'FINN.no visual identity across desktop, tablet and mobile' },
      /* Office photographs close the case, in the original 1–6 order. */
      { file: 'finn-lokaler/1-half-v1.jpg', span: 'half', alt: 'FINN-branded cushion with colorful geometric shapes' },
      { file: 'finn-lokaler/2-half-v1.jpg', span: 'half', alt: 'FINN meeting rooms with illustrated glass walls' },
      { file: 'finn-lokaler/3-half-v1.jpg', span: 'half', alt: 'Blue FINN illustration wall beneath a sloping office roof' },
      { file: 'finn-lokaler/4-half-v1.jpg', span: 'half', alt: 'FINN office interior with colorful chairs and illustrated partitions' },
      { file: 'finn-lokaler/5-half-v1.jpg', span: 'half', alt: 'FINN glass doors decorated with geometric frames and animal photographs' },
      { file: 'finn-lokaler/6-half-v1.jpg', span: 'half', alt: 'FINN sign above a red wall-mounted coat rack' },
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
      { file: 'uber-cover-1.jpg', span: 'full', alt: 'Uber' },
      { file: 'misc-uber.mp4', span: 'full', alt: 'Uber' },
      {
        type: 'text', span: 'full',
        text: 'We helped move Uber from all black to a friendlier, more colorful world, with a global design system full of local character. City pages came alive through language, color, patterns and Stout’s illustrations of cities around the world. The scale of that work still amazes me. It was my first time designing for right-to-left reading—a fascinating challenge. And I loved “the bit”: a little square that gave the main call to action a home, always there to show you the way.',
      },
      {
        type: 'tabs', span: 'full', id: 'uber-countries', label: 'Uber around the world',
        heading: 'A design system across borders',
        description: 'Explore the local versions of Uber’s website.',
        width: 1290, height: 762,
        tabs: [
          { file: 'uber-ueno-china-full.jpg', label: 'China' },
          { file: 'uber-ueno-france-full.jpg', label: 'France' },
          { file: 'uber-ueno-india-full.jpg', label: 'India' },
          { file: 'uber-ueno-ireland-full.jpg', label: 'Ireland' },
          { file: 'uber-ueno-mexico-full.jpg', label: 'Mexico' },
          { file: 'uber-ueno-morocco-full.jpg', label: 'Morocco' },
          { file: 'uber-ueno-nl-full.jpg', label: 'Netherlands' },
          { file: 'uber-ueno-singapore-full.jpg', label: 'Singapore' },
          { file: 'uber-ueno-usa-full.jpg', label: 'USA' },
          { file: 'uber-ueno-australia-full.jpg', label: 'Australia' },
        ],
      },
      /* Fra Ueno sin case-studie av uber.com (web.archive.org, 2021-01-14). */
      { file: 'uber-ueno-hero-full.mp4', span: 'full', alt: 'Uber' },
      { file: 'uber-ueno-headers-full.mp4', span: 'full', alt: 'Uber' },
      {
        type: 'gallery', span: 'full', label: 'Uber website pages',
        images: [
          { file: 'uber-ueno-ubercity-original.jpg', alt: 'City' },
          { file: 'uber-ueno-rider-original.jpg', alt: 'Rider' },
          { file: 'uber-ueno-wheel-original.jpg', alt: 'Wheel' },
          { file: 'uber-ueno-career-1-2x.jpg', alt: 'Careers' },
          { file: 'uber-ueno-career-2-original.jpg', alt: 'Careers — job details' },
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
      { file: 'boligmappa-cover-2.jpg', span: 'full', alt: 'Boligmappa' },
      { file: 'boligmappa.000.jpeg', span: 'full', alt: 'Boligmappa — redesigned website on desktop and mobile' },
      {
        type: 'comparison', span: 'full', label: 'Boligmappa website before and after',
        before: { file: 'boligmappa.005-before.jpeg', alt: 'Boligmappa website before the redesign' },
        after: { file: 'boligmappa.006-after.jpeg', alt: 'Boligmappa website after the redesign' },
      },
      { file: 'boligmappa.001.jpeg', span: 'full', alt: 'Boligmappa — illustrated error page' },
      { file: 'boligmappa.002.jpeg', span: 'full', alt: 'Boligmappa — evolution of the folder logo' },
      { file: 'boligmappa.003.jpeg', span: 'full', alt: 'Boligmappa — visual identity across digital design, illustration and merchandise' },
      { file: 'boligmappa.004.jpeg', span: 'full', alt: 'Boligmappa — visual identity guidelines' },
      { file: 'boligmappa.007.webp', span: 'full', alt: 'Boligmappa — home documentation on a phone beside a cup of coffee' },
      { file: 'boligmappa.008.webp', span: 'full', alt: 'Boligmappa — Norges vakreste bolig billboard' },
      { file: 'boligmappa.010.webp', span: 'full', alt: 'Boligmappa — brand presentation on a conference screen' },
    ],
  },
]
