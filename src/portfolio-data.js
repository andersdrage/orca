/** @typedef {{ file: string, alt?: string, caption?: string }} MediaItem */

/**
 * Order: MICROMILSPEC → Off Market → misc (Uber first).
 * `span` matches filename: full | half
 * `caption` – valgfri kort tekst under bildet/video (10px, sentrert, zinc-600)
 */
export const portfolioCases = [
  {
    id: 'micromilspec',
    title: 'MICROMILSPEC',
    intro:
      'Co-built the brand, product, and operations — scaling to ~40 MNOK in sales across bespoke and military projects in three years.',
    items: [
      /* Hero = samme bilde som tidslinje-tilen — morphen lander sømløst i seg selv. */
      { file: 'micromilspec-6-half.jpg', span: 'full', alt: 'MICROMILSPEC' },
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
    id: 'misc',
    title: 'Selected work',
    intro: 'Fragments from client and side projects.',
    items: [
      { file: 'misc-uber.mp4', span: 'full', alt: 'Uber' },
      { file: 'misc-aprila.jpg', span: 'full', alt: 'Aprila Bank' },
      { file: 'misc-brevio.jpg', span: 'full', alt: 'Brevio' },
      { file: 'misc-finn.jpg', span: 'full', alt: 'Finn' },
      { file: 'misc-logos.jpg', span: 'full', alt: 'Logos' },
      { file: 'misc-nettavisen.jpg', span: 'full', alt: 'Nettavisen' },
      { file: 'misc-nike.jpg', span: 'full', alt: 'Nike' },
      { file: 'misc-pressworks.jpg', span: 'full', alt: 'Pressworks' },
    ],
  },
]
