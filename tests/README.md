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
currently contains 77 tests. Vite dev/preview serves the same 404.html that Vercel
uses from the build output.

History checks cover the current route, camera navigation, Back/Forward and the single
English NSB entry. Retired /archive and /misc routes return 404 without redirects,
as requested before launch. Uber country tabs cover all ten panels, arrow/Home/End
keys, focus, reduced motion, marker geometry on resize and mobile overflow.
Project-block checks (DRA-48) verify all 158 media items across 26 blocks (27 projects; Capa and Logos share the introduction),
desktop/mobile separation and lightbox indices. Error-page checks also cover the
shared footer hover treatment and keyboard focus without a frame around the page.
Safari/WebKit uses Option+Tab for the button-focus check because ordinary Tab can
exclude buttons when full keyboard access is disabled.

The audit's existing Chromium `Transition was skipped` exception is excluded from
the storage error assertion only. Other uncaught errors fail that check. These tests
do not assert cover-morph fidelity, physical iOS behavior or full screen-reader support.

The September follow-up adds interrupted camera continuity, native modified-link behavior,
mobile intro geometry at 320/390/430 px, delayed archive image sizing in WebKit,
audio failure/retry, interrupted transcript transitions, inactive media deferral,
and bounded/data-saving-aware case preparation. Case preparation remains bounded and does not prerender the destination.
The screenshot script traverses the active world cell for lazy media as well as
ordinary document scrolling on case pages.

The contrast/motion follow-up adds computed contrast at rest and on hover at desktop/mobile widths,
footer hover/focus, immediate timeline keyboard steps, case/lightbox playback controls,
manual pause persistence, and live reduced-motion preference changes.


## Automated pull-request checks

`.github/workflows/frontend.yml` runs the same production-preview suite in separate
Chromium and WebKit jobs on pull requests, pushes to main and manual dispatch.
It uses Node 22 on Ubuntu 24.04, installs packages from the lockfile and browser/system
dependencies, and retains test output for 14 days. No deployment credentials are needed;
the workflow has read-only repository permission. A failed browser job fails the check.
Older runs for the same branch are canceled when superseded.

The setup follows [Playwright's CI guidance](https://playwright.dev/docs/ci) and
[GitHub's Node.js workflow guidance](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs),
using the existing Node test runner instead of adding another framework.

The first hosted run remains to be verified after pushing. Making these checks mandatory
in branch protection is a separate repository setting; this workflow does not change it.
The local equivalent is `TEST_BROWSERS=chromium,webkit npm test` using Node 22.

## Screenshot checks

Run the app or preview first, then use `npm run screenshots -- <label>`.
Set `SCREENSHOT_BASE` when it is not running at http://localhost:5173.
Optional exact comma-separated filters: `SCREENSHOT_ROUTES` and `SCREENSHOT_VIEWPORTS`.
For example:

```sh
SCREENSHOT_BASE=http://127.0.0.1:4176 SCREENSHOT_ROUTES=/history/,/archived-work/ SCREENSHOT_VIEWPORTS=mobile npm run screenshots -- history-check
```

World routes produce overlapping viewport frames (`history-mobile.png`,
`history-mobile-02.png`, etc.). A long element screenshot would enlarge the viewport,
change the camera world's layout and reveal neighboring cells. Dedicated cases retain
full-page screenshots; the homepage retains a single viewport. Capture uses reduced
motion and waits for fonts and decoded images. A failed image or timeout fails the
command instead of silently writing a screenshot with missing media.

`scripts/screenshot-media.mjs` is exercised against the real mobile Archived work route
in both browsers. Tests verify all gallery images load, inactive cells stay untouched,
scrolling returns to the top, and blocked images produce an actionable failure.

## DRA-72: plain project navigation

The previous index/project morph, fallback animation, and staggered case entrance are removed. Regression checks cover plain opening and return navigation on desktop and mobile with normal and reduced motion, including the last loop item, Close, browser Back, visible-media autoplay, and saved overview state. `tests/session-state.test.mjs` retains the cached-document storage check from the retired transition helper tests.

## DRA-72: same-document thumbnail reveal

The clicked thumbnail is captured with `document.startViewTransition()`, while the real case is mounted inside the current document. Tests verify persistent document identity and URL/history behavior as well as desktop/touch-mobile frames, painted image pixels, intro scale/fade and stable settled geometry, cancellation and skipped transitions. The overview retains its original DOM, focus and scroll offsets. Repeated case mounts check that keyboard handlers, dialogs and controls are cleaned up. Failed preparation retains the ordinary project-link fallback; unsupported animation and reduced motion keep same-document navigation.

The return-motion iteration adds frame checks for the slower opening and for the thumbnail rising back into its original slot. Desktop mouse clicks and mobile touch taps cover completed and interrupted reveals; the case disappears immediately, image size and final position stay stable, and reduced motion skips the return.

Partially visible Hjemla and Off Market clicks now verify that neighbouring snapshots stay opaque, move outward in either direction, fully clear the viewport, and clean up their names/styles on Close. Intro scale/fade checks verify that the notes and media wait until the complete reveal ends.
