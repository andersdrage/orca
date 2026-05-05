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
      { file: 'micromilspec-1-full.mp4', span: 'full', alt: 'MICROMILSPEC' },
      { file: 'micromilspec-3-half.jpg', span: 'half', alt: 'MICROMILSPEC' },
      { file: 'micromilspec-4-half.jpg', span: 'half', alt: 'MICROMILSPEC' },
      { file: 'micromilspec-5-full.jpg', span: 'full', alt: 'MICROMILSPEC' },
      { file: 'micromilspec-6-half.jpg', span: 'half', alt: 'MICROMILSPEC' },
      { file: 'micromilspec-7-half.mp4', span: 'half', alt: 'MICROMILSPEC' },
      { file: 'micromilspec-2-full.mp4', span: 'full', alt: 'MICROMILSPEC' },
      { file: 'micromilspec-8-half.jpg', span: 'half', alt: 'MICROMILSPEC' },
      { file: 'micromilspec-9-half.jpg', span: 'half', alt: 'MICROMILSPEC' },
      { file: 'micromilspec-10-half.jpg', span: 'half', alt: 'MICROMILSPEC' },
      { file: 'micromilspec-11-half.jpg', span: 'half', alt: 'MICROMILSPEC' },
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
