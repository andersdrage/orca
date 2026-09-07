# Frontend regression checks

Run `npm test` for Chromium or `TEST_BROWSERS=chromium,webkit npm test` for both engines. The runner builds the site and starts an isolated production preview.

Covers named links, world focus and skip links, failure/retry states, case return navigation, optional storage, error/404 layouts and dragon fallback behavior. Real iOS, full animation fidelity and audio failure recovery remain separate audit work.
