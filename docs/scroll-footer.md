# Scroll footer — 9 September 2026

The new default is a light footer in normal document flow. Its background follows
the page, and the dragon follows scroll input with decaying momentum. Reverse
scrolling reverses the rotation. Reduced motion and data-saving preferences keep
a still image. Hidden pages do not render the sequence.

The earlier black reveal footer and its switch have been removed. The dragon
is now 40% smaller (84–120 px wide). The video remains only as the source for
the extracted PNG frames.

## Dragon PNG sequence

- Source: `public/images/drage-black-bg-preview-001.mp4`, unchanged.
- Full-resolution PNGs: `originals/dragon-scroll-2026-09-09/frame-000.png` through
  `frame-119.png` (480 × 480; 12 frames/second; one complete 10-second rotation).
- Browser PNGs: `public/images/dragon-scroll/` (320 × 320; about 2.4 MB in total).
  Silver luminance becomes charcoal opacity, removing the black matte while
  keeping the reflections and smooth edges on a light background.
- Generator: `node scripts/extract-dragon-frames.mjs`. It refuses to overwrite the
  original PNG extraction. Use a new originals folder to make another extraction.

The browser shares one decoded sequence across all mounted footers, loads it near
the active footer, and uses a canvas to avoid changing image URLs while scrolling.

## Project backgrounds

Default colors are sampled from the current project thumbnails by
`node scripts/sample-project-colors.mjs`. A click samples the actual thumbnail too,
so alternate covers are respected. The most represented chromatic hue is mixed
at eight percent with the original off-white. Direct links use the generated
fallbacks. Native document transitions blend the surfaces; other browsers use a
color interpolation. All case media gaps and the light footer share the tint.

Before/after desktop, mobile, and motion captures are in the dated, Git-ignored
`screenshots/` folders for this experiment.
