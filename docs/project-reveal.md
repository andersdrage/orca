# DRA-72 — thumbnail reveal

Clicking a project in the index reveals the actual case intro and title block behind the selected thumbnail. Only the thumbnail moves: straight down below the viewport over 560 ms, after a 50 ms hold. Its clicked crop and hover size are retained. The case stays still and its controls remain interactive.

The browser captures the existing thumbnail and holds the source document until the destination is ready. The document root is excluded from view-transition snapshots. There is no copied image to decode on arrival, whole-page fade, reverse transition, or scripted fallback animation.

`src/project-reveal.js` limits the effect to a fresh same-tab index click in presentation mode. It consumes the navigation hint once, clears source names on return, and cancels on scroll, resize, keyboard input or leaving the page. Close, Back/Forward, reduced motion, legacy layouts, and unsupported or skipped native transitions use ordinary navigation.

Rollback: `b06bb68` is the plain-navigation starting point on `codex/dra-72-project-transition`. `ac45dfe` is the earlier main-branch baseline.

Validation covers both Chromium and WebKit, desktop/mobile frames, painted thumbnail pixels, stationary case geometry, repeated navigation, reload, immediate close, scroll interruption, skipped transitions and saved index position. Dated captures under `screenshots/` preserve the iterations; the `2026-09-09_dra72-slide-final` folder contains the desktop frames, and `2026-09-10_dra72-slide-mobile-check` contains the final touch-device frames after filtering Safari’s unchanged-viewport resize event.
