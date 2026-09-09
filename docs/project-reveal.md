# DRA-72 — same-document thumbnail reveal

Index-to-project clicks now load the case inside the existing document. The project HTML and intro fonts are prepared before `document.startViewTransition()` captures the clicked thumbnail. The case intro and title block are mounted behind that snapshot; only the image slides down, over 560 ms after a 50 ms hold. The document root is excluded from snapshots, and the case controls remain interactive.

The overview stays mounted in a hidden, inert container with its original scroll positions. Close returns through the case history entries to the originating overview. Browser Back/Forward restores individual case entries and their scroll positions. Project arrows also stay in the current document. URLs, titles and social/description metadata update with each case; direct URLs and reloads retain their standalone HTML entries.

`src/project-navigation.js` coordinates preparation, history, mount/unmount and cancellation. `src/case-view.js` installs case controls and returns a cleanup function for global listeners, observers, media and dialogs. `src/project-page.js` shares a bounded document cache with intent warmup and evicts failed requests. The footer observer releases removed cases.

Reduced motion, keyboard activation, legacy layouts and browsers without View Transitions swap content immediately in the same document. Scroll, resize, Escape and subsequent navigation interrupt an active reveal. Failed preparation falls back to the ordinary project link. A standalone case opened directly still uses ordinary navigation when Close needs an overview document that has not been loaded.

The hover enlargement was removed in the preceding iteration. Scroll-based thumbnail magnification remains.

Rollback: `af8bc1c` keeps the hover removal and the earlier cross-document reveal; `b06bb68` is the plain-navigation starting point; `ac45dfe` is the earlier main-branch baseline. Changes remain on `codex/dra-72-project-transition` until explicitly pushed.

The final 16 focused checks pass in Chromium and WebKit. Broader checks also cover the reusable controls, media, footer and storage behavior; the pre-existing archive-content assertion remains outside this change.

Validation covers persistent document identity, actual image pixels, stationary intro geometry, desktop and touch mobile sizes, Back/Forward, Close after project arrows, overview focus and exact timeline position, control cleanup, interrupted/pending/failed navigation, and an unavailable View Transitions API. Dated before/after captures and intermediate frames are saved locally under `screenshots/`.
