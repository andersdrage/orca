# Launch audit — 11 September 2026

Seventeen remaining Linear issues were completed or resolved against the approved design. Six remain open because they need personal content, factual confirmation, or a physical iPhone check. The implementation was published to `orca/main` and Vercel as `e49856f`.

## Changes

- About starts 170px higher, retaining the 200px portrait. A 600px WebP display file reduces the portrait from 823,313 to 22,730 bytes; the original stays available.
- Added a neutral `theme-color` of `#e9e9e9` and an opaque, centered 180px Apple touch icon.
- Renamed 347 project assets by project and sequence. `media-renames-2026-09-11.json` records the mapping. Image bytes and presentation order are unchanged; old URLs permanently redirect. Shared UI artwork and the editable FINN morph SVG retain descriptive names.
- Short landscape screens keep a visible first-media cue and at least 10px between the intro and media. Desktop and portrait layouts are unchanged by this adjustment.
- Updated stale regression expectations for the removed Micromilspec credit, AGENS image selection, approved title-block heights, persistent inspector, and finite transition animations. Tests no longer try to finish the infinite introductory chevrons.

## Verification

The full Chromium/WebKit and component run contained 188 checks: 170 passed initially. Eighteen outdated or failing checks were investigated and rerun after corrections; all subsequently passed. The last four layout checks passed in both engines. This is combined evidence from the full run and focused reruns, not a claim that the first full run was green.

All 347 old media URLs returned the expected redirect in the production preview, and all target files existed. SHA-256 checks verified every renamed asset retained its bytes. Production samples confirmed old Nettavisen and Uber cover URLs redirect to working images. Metadata was checked on all 14 public entry pages; production HTML includes the new portrait and browser theme, and the touch icon returns 200.

WebKit scroll sampling at 1440×900 and 390×844 recorded 240 intervals each: median 17ms, p95 20ms, none over 33.4ms. This four-second sample is specific to this machine and simulated input. Ordinary macOS Safari was also checked for project opening and return. It does not substitute for a physical iPhone review.

Dated desktop/mobile before-and-after screenshots and the landscape comparison are saved locally under `screenshots/2026-09-11_*`. Lighthouse reports and the scroll profile are in `screenshots/2026-09-11_launch-audit/` (intentionally ignored by Git).

## Production Lighthouse

Lighthouse 12.8.2 used `https://andersdrage-com.vercel.app/`, the production alias, because local DNS still intermittently resolved the custom domain to its old host.

| Run | Performance | Accessibility | Best practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| Desktop before | 82 | 100 | 100 | 100 |
| Desktop after | 91 | 100 | 100 | 100 |
| Mobile before | 71 | 100 | 100 | 100 |
| Mobile after, standard timing | 69 | 95 | 100 | 100 |
| Mobile accessibility after intro settles | — | 100 | — | — |

The standard mobile run measured LCP 8.9s, TBT 10ms, CLS 0. LCP is delayed mainly by the approved map/intro choreography. The transient contrast findings were navigation links caught during their fade; a separate accessibility run with a six-second post-load pause scored 100. The animation was retained. These are individual lab runs, not field measurements or a guarantee of improved mobile performance.

## Linear disposition

Completed: DRA-8, 20, 21, 22, 23, 24, 25, 26, 27, 28, 30, 31, 38, 43, 70, 72, 73.

- DRA-43: footer uses the real Maison Book font at weight 400; no synthetic bold there. Some other Maison headings still request 700 and can be synthesized.
- DRA-26: inspector retained behind S, invisible on normal entry; FPS stays inside it.
- DRA-28/38: old black/footer-halo proposals were superseded by the approved interactive dragon.
- DRA-27: authoritative DNS and Vercel configuration are valid; local cache may still return the old server.

Still open:

- DRA-13: final service/year confirmation. Existing HMKG 2014, Humming People 2018, Brathwait 2015 and Mountain Milk 2011 were preserved.
- DRA-17: personal gratitude notes from Anders.
- DRA-19: stories/audio for additional projects.
- DRA-29: physical iPhone Safari, browser chrome and overscroll review.
- DRA-34: selection of 2025 notable projects.
- DRA-44: confirmed context for Interiørmagasinet and Bo Bedre press links.

Each issue has a dated explanation in Linear. No personal histories or missing facts were invented.
