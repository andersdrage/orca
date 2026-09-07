# Frontend regression checks

Run `npm test` for Chromium or `TEST_BROWSERS=chromium,webkit npm test` for both engines. The runner builds the site and starts an isolated production preview.

Covers navigation, focus, errors/404, storage and case returns, plus History, removed legacy routes, archived project groups and lightbox keyboard/focus behavior. There are 116 archive media items across 20 projects in 19 blocks.

Real iOS, full animation fidelity, screenshot-script lazy media traversal and audio failure recovery remain separate audit work.
