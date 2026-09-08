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
    id: 'micromilspec',
    title: 'MICROMILSPEC',
    displayTitle: 'Micromilspec',
    layout: 'split',
    intro:
      'Co-built the brand, product, and operations — scaling to ~40 MNOK in sales across bespoke and military projects in three years.',
    credits: [
      { role: 'Co-founder', names: 'Henrik Rye' },
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
    id: 'hmkg',
    title: 'HMKG',
    intro: 'Premium business cards for His Majesty The King’s Guard.',
    items: [
      { file: 'hmkg-1-full.jpg', span: 'full', alt: 'HMKG' },
      { file: 'hmkg-2-full.jpg', span: 'full', alt: 'HMKG' },
      { file: 'hmkg-3-full.jpg', span: 'full', alt: 'HMKG' },
      { file: 'hmkg-4-full.jpg', span: 'full', alt: 'HMKG' },
    ],
  },
  {
    id: 'off-market',
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
    id: 'mountain-milk',
    title: 'Mountain Milk',
    intro: 'Case study in the works — more on this project soon.',
    items: [
      { file: 'mm-1.jpg', span: 'full', alt: 'Mountain Milk' },
      { file: 'mm-2.jpg', span: 'full', alt: 'Mountain Milk' },
      { file: 'mm-3.jpg', span: 'full', alt: 'Mountain Milk' },
      /* Triptyk — vises tre i bredden. */
      { file: 'mm-4-1-3.jpg', span: 'third', alt: 'Mountain Milk' },
      { file: 'mm-4-2-3.jpg', span: 'third', alt: 'Mountain Milk' },
      { file: 'mm-4-3-3.jpg', span: 'third', alt: 'Mountain Milk' },
    ],
  },
  {
    id: 'nettavisen',
    title: 'Nettavisen',
    intro:
      'Led an embedded design team through Nettavisen’s rebrand and product redesign — working in short sprints and testing with readers to better reflect the quality of its journalism and challenge its tabloid reputation.',
    credits: [
      { role: 'Creative Director', names: 'Anders Drage' },
      { role: 'Designers', names: 'Fredrik Lien Bjørgmo, Line Rosvoll Holmen, Neno Mindjek' },
      { role: 'Strategy & client director', names: 'Jonas Feiring' },
      { role: 'Client', names: 'Pål Nisja' },
    ],
    items: [
      /* Hero = samme cover som tidslinje-tilen. */
      { file: 'nettavisen-cover.jpg', span: 'full', alt: 'Nettavisen' },
      { file: 'na-03.mp4', span: 'full', alt: 'Nettavisen' },
      { file: 'misc-nettavisen.jpg', span: 'full', alt: 'Nettavisen digital design overview' },
    ],
  },
  {
    id: 'finn',
    title: 'FINN.no',
    intro:
      'Helped shape a new visual identity and future vision for FINN.no at Brandlab — a design language that has evolved over a decade to connect everything from digital experiences and advertising to physical office spaces.',
    credits: [
      { role: 'Creative Director', names: 'Miriam Skovholt Mortensen' },
      { role: 'Designers', names: 'Anders Drage, Ludvig Bruneau Rossow and Truong Vu Pham' },
      { role: 'Strategy', names: 'Monna Nordhagen, Kirsti Rogne, Jonas Feiring' },
      { role: 'Project management', names: 'Caroline Hanssen' },
      { role: 'Reel', names: 'Lars Hoel' },
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
    id: 'humming-people',
    title: 'Humming People',
    intro: 'LP and booklet design for the band Humming People.',
    items: [
      { file: 'hp-1-full.jpg', span: 'full', alt: 'Humming People' },
      { file: 'hp-2-full.jpg', span: 'full', alt: 'Humming People' },
      { file: 'hp-3-half.jpg', span: 'half', alt: 'Humming People' },
      { file: 'hp-4-half.jpg', span: 'half', alt: 'Humming People' },
      { file: 'hp-5-full.jpg', span: 'full', alt: 'Humming People' },
      { file: 'hp-6-half.jpg', span: 'half', alt: 'Humming People' },
      { file: 'hp-7-half.jpg', span: 'half', alt: 'Humming People' },
      { file: 'hp-8-full.jpg', span: 'full', alt: 'Humming People' },
      { file: 'hp-9-half.jpg', span: 'half', alt: 'Humming People' },
      { file: 'hp-10-half.jpg', span: 'half', alt: 'Humming People' },
      { file: 'hp-11-full.jpg', span: 'full', alt: 'Humming People' },
    ],
  },
  {
    id: 'brathwait',
    title: 'Brathwait',
    intro: 'Brand and UX design for the watch brand Brathwait.',
    items: [
      /* Hero = samme cover som tidslinje-tilen. Deretter presentasjonen i
         sekvens, alle i full bredde under hverandre. */
      { file: 'brathwait-cover.jpg', span: 'full', alt: 'Brathwait' },
      { file: 'brathwait-1.jpg', span: 'full', alt: 'Brathwait' },
      { file: 'brathwait-2.jpg', span: 'full', alt: 'Brathwait' },
      { file: 'brathwait-3.jpg', span: 'full', alt: 'Brathwait' },
      { file: 'brathwait-4.jpg', span: 'full', alt: 'Brathwait' },
      { file: 'brathwait-5.jpg', span: 'full', alt: 'Brathwait' },
      { file: 'brathwait-6.jpg', span: 'full', alt: 'Brathwait' },
      { file: 'brathwait-7.jpg', span: 'full', alt: 'Brathwait' },
      { file: 'brathwait-8.jpg', span: 'full', alt: 'Brathwait' },
      { file: 'brathwait-9.jpg', span: 'full', alt: 'Brathwait' },
      { file: 'brathwait-10.jpg', span: 'full', alt: 'Brathwait' },
      { file: 'brathwait-11.jpg', span: 'full', alt: 'Brathwait' },
      { file: 'brathwait-12.jpg', span: 'full', alt: 'Brathwait' },
      { file: 'brathwait-13.jpg', span: 'full', alt: 'Brathwait' },
      { file: 'brathwait-14.jpg', span: 'full', alt: 'Brathwait' },
      { file: 'brathwait-15.jpg', span: 'full', alt: 'Brathwait' },
      { file: 'brathwait-16.jpg', span: 'full', alt: 'Brathwait' },
      { file: 'brathwait-17.jpg', span: 'full', alt: 'Brathwait' },
      { file: 'brathwait-18.jpg', span: 'full', alt: 'Brathwait' },
      { file: 'brathwait-19.jpg', span: 'full', alt: 'Brathwait' },
      { file: 'brathwait-20.jpg', span: 'full', alt: 'Brathwait' },
      { file: 'brathwait-21.jpg', span: 'full', alt: 'Brathwait' },
      { file: 'brathwait-22.jpg', span: 'full', alt: 'Brathwait' },
    ],
  },
  {
    id: 'uber',
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
    title: 'Boligmappa',
    intro:
      'Led the rebrand of Boligmappa, a home documentation platform serving 1.2 million homeowners — redesigning its marketing website and logged-in experience.',
    items: [
      /* Hero = samme cover som tidslinje-tilen (duell-vinneren: to telefoner). */
      { file: 'boligmappa-cover-2.jpg', span: 'full', alt: 'Boligmappa' },
    ],
  },
]
