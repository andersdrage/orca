# Frontend regression checks

Run `npm test` for Chromium, or `TEST_BROWSERS=chromium,webkit npm test` for both engines.
Install the browser runtimes once with `npx playwright install chromium webkit` if needed.
The runner builds the site, starts a temporary local preview and closes it afterwards.
No server needs to be running beforehand, and no new test dependency is required.

These tests cover the first accessibility and navigation fixes from the frontend audit:
DRA-49, DRA-50, DRA-51, DRA-54, DRA-55 and DRA-60. They exercise keyboard input,
world navigation/history, recoverable page failures, dialog focus, case exits, cover
preferences and denied storage against the built application. Failure injections and
one synthetic case-entry link stay inside isolated browser contexts.

Most tests use reduced motion to avoid relying on animation timings. The rapid-travel
test uses normal motion. The mobile lightbox test crosses the gallery breakpoint
while the dialog is open. Storage checks visit all 18 public entry points.

The error-page iteration adds shared layout/media checks and a standalone 404:
centered content without the footer card, one recovery action, motion preferences,
inactive-video pausing, a still-image fallback, and actual HTTP 404 responses with
a working home link even when JavaScript is disabled. The full two-engine run
currently contains 48 tests. Vite dev/preview serves the same 404.html that Vercel
uses from the build output.

History checks cover the current route, camera navigation, Back/Forward and the single
English NSB entry. Retired /archive and /misc routes return 404 without redirects,
as requested before launch. Uber country tabs cover all ten panels, arrow/Home/End
keys, focus, reduced motion, marker geometry on resize and mobile overflow.
Project-block checks (DRA-48) verify all 116 media items across 19 blocks (20 projects; Capa and Logos share the introduction),
desktop/mobile separation and lightbox indices. Error-page checks also cover the
shared footer hover treatment and keyboard focus without a frame around the page.
Safari/WebKit uses Option+Tab for the button-focus check because ordinary Tab can
exclude buttons when full keyboard access is disabled.

The audit's existing Chromium `Transition was skipped` exception is excluded from
the storage error assertion only. Other uncaught errors fail that check. These tests
do not assert cover-morph fidelity, physical iOS behavior or full screen-reader support.
