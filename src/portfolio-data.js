/** @typedef {{ file: string, alt?: string, caption?: string }} MediaItem */

/**
 * Order: MICROMILSPEC → Off Market → misc (Uber first).
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
    intro:
      'Co-built the brand, product, and operations — scaling to ~40 MNOK in sales across bespoke and military projects in three years.',
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
    intro: 'Case study in the works — more on this project soon.',
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
    intro:
      'Co-founded Off Market, a real-estate marketplace matching buyers and sellers before homes reached the open market — leading product, design, and marketing.',
    items: [
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
    intro: 'Design for Nettavisen, one of Norway’s largest news sites.',
    credits: [
      { role: 'Creative Director', names: 'Anders Drage' },
      { role: 'Designers', names: 'Fredrik Lien Bjørgmo, Line, Neno Mindjek' },
      { role: 'Strategy & client director', names: 'Jonas Feiring' },
      { role: 'Client', names: 'Pål Nisja' },
    ],
    items: [
      /* Hero = samme cover som tidslinje-tilen. */
      { file: 'nettavisen-cover.jpg', span: 'full', alt: 'Nettavisen' },
      { file: 'na-03.mp4', span: 'full', alt: 'Nettavisen' },
    ],
  },
  {
    id: 'finn',
    title: 'FINN.no',
    intro: 'Brand and UX design for FINN.no.',
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
    intro: 'Product design for Uber.',
    credits: [
      { role: 'Creative Director', names: 'Halli' },
      { role: 'Designers', names: 'Ben Mingo, Anders Drage and Simon' },
    ],
    items: [
      /* Hero = videoen; posteren (første frame) er tidslinje-tilen, så morphen
         lander i nøyaktig samme bilde før videoen spiller. */
      { file: 'misc-uber.mp4', span: 'full', alt: 'Uber' },
    ],
  },
  {
    id: 'boligmappa',
    title: 'Boligmappa',
    intro: 'Design for Boligmappa — the digital home folder for Norwegian homes.',
    items: [
      /* Hero = samme cover som tidslinje-tilen. */
      { file: 'boligmappa-cover.jpg', span: 'full', alt: 'Boligmappa' },
    ],
  },
  {
    /* MIDLERTIDIG: cover-duell mot 'boligmappa' — taperen slettes. */
    id: 'boligmappa-2',
    title: 'Boligmappa',
    intro: 'Design for Boligmappa — the digital home folder for Norwegian homes.',
    items: [
      { file: 'boligmappa-cover-2.jpg', span: 'full', alt: 'Boligmappa' },
    ],
  },
  {
    id: 'misc',
    title: 'Miscellaneous work',
    intro: 'Fragments from client and side projects.',
    items: [
      { file: 'misc-agens-1.jpg', span: 'full', alt: 'Agens' },
      { file: 'misc-agens-2.jpg', span: 'full', alt: 'Agens' },
      { file: 'misc-agens-3.jpg', span: 'full', alt: 'Agens' },
      { file: 'misc-agens-4.jpg', span: 'full', alt: 'Agens' },
      { file: 'misc-aprila.jpg', span: 'full', alt: 'Aprila Bank' },
      { file: 'misc-brevio.jpg', span: 'full', alt: 'Brevio' },
      { file: 'misc-logos.jpg', span: 'full', alt: 'Logos' },
      { file: 'misc-nettavisen.jpg', span: 'full', alt: 'Nettavisen' },
      { file: 'misc-nike.jpg', span: 'full', alt: 'Nike' },
      { file: 'misc-pressworks.jpg', span: 'full', alt: 'Pressworks' },
    ],
  },
]
