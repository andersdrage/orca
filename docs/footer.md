# Interactive footer dragon

The footer uses one lazy-loaded Three.js renderer, shared across mounted pages.
Drag or flick to rotate; arrow keys rotate and Home centers the dragon. Rendering
pauses offscreen and in hidden tabs. Reduced motion disables the automatic loop;
data saving and WebGL failures preserve `/images/footer-dragon-still.png`.

The old scroll-controlled PNG sequence, extraction script, video source and
`scroll-dragon.js` entry point have been removed. `src/init-footer-dragons.js`
connects active footer elements to `src/footer-dragon.js`.

Rebuild prepared assets with `npm run prepare-footer-dragon` after changing their
source settings, geometry, finish or lighting. See `footer-dragon-performance.md`.

Focused validation:

```
node --test tests/footer-background.test.mjs tests/footer-dragon.test.mjs tests/footer-dragon-assets.test.mjs tests/dragon-motion.test.mjs
```

Before/after desktop and mobile captures, including the drag state, are saved in
`screenshots/2026-09-11_0020_footer-3d-before/` and
`screenshots/2026-09-11_0021_footer-3d-after/` (local, ignored by Git).
