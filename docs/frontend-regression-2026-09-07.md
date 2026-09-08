# DRA-66 — regression checks and screenshot capture

| Before | After | Benefit / tradeoff |
| --- | --- | --- |
| Behavioral tests run only when requested locally | GitHub Actions runs Chromium/WebKit separately on PRs, main pushes and manual dispatch | Regressions produce a failing check; adds browser installation and test time to CI |
| Lazy-media traversal was not tested | Shared screenshot preparation is checked against the real mobile archive, including blocked images | Loading failures are reported; every archive image must decode |
| Long world-column screenshots resized the viewport and captured neighboring cells | World routes use overlapping viewport screenshots | More files, but each preserves the site's actual viewport-dependent geometry |

## Acceptance coverage

| Area | Evidence |
| --- | --- |
| Production build and isolated preview | npm test builds dist; the suite starts and stops its own local preview |
| World routing, Back/Forward and focus | Route/focus, skip-link and interrupted-camera tests |
| Named homepage links and selected-case return | Accessible-link and timeline return tests |
| Archived case arrows/close | Direct entry, saved overview, arrow chain and reload tests |
| Fetch failures and retry | HTTP, network, malformed and delayed sibling responses; retry initialization |
| Audio and dialogs | Failed audio/retry, transcript interruption, lightbox focus and preference changes |
| Reduced motion and optional storage | Immediate timeline keys, intentional video playback, denied storage getters/methods |
| Lazy screenshot capture | All active archive images decode, inactive pages stay deferred, failed images reject |
| Side effects | Tests use isolated contexts/local test data; no source content changes or contact messages |

Validation: 77/77 tests pass across Chromium and WebKit on macOS with Node 22.22.3, no skips. The workflow YAML parses successfully. Actual screenshot commands were run for mobile History/Archived work and desktop History/FINN. Mobile frames from the middle and bottom were visually inspected.

Artifacts: screenshots/2026-09-07_1440_dra66-verified/ (25 mobile frames). Logs are retained locally with the screenshot artifacts. See tests/README.md for the commands and filters.

The GitHub-hosted Ubuntu run is configured but has not run: changes have not been committed or pushed. Real Safari/iOS, complete screen-reader coverage, visual morph fidelity and field performance remain separate audit work. The existing native Command-click automation limitation is not resolved by adding CI. Branch protection is unchanged.
