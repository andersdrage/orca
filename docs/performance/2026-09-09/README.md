# Transition performance verification — 9 September 2026

Nine passes, additional Retina runs, and a final compositor trace were completed. The retained full-route runs contain **340 complete round trips / 680 project transitions**, covering all eight featured projects and repeat visits, including baseline versions with defects. The smaller opening-only runs and earlier diagnostic traces are additional.

The final Chromium Retina trace recorded **zero fully dropped compositor frames during the measured animation ranges** for the opening map, thumbnail entrance, project entry and project return. The surrounding entry/return preparation windows also contained no fully dropped frames in this final run; partial-update markers remain. This is evidence of a substantial improvement, **not proof of an unconditional, perfectly locked 60 FPS on every frame or device**. Startup and navigation-boundary stalls remain observable; they are included below.

## Changes

- The thumbnail spring now schedules frames only while it is moving. Scrolling, resizing, pointer release, preference changes, visibility changes and page restoration wake it again. Idle thumbnails no longer keep writing styles.
- Unique covers decode before their entrance. Hover, focus or touch prepares each featured case's actual first visible image or video poster, its document, shared scripts/styles and fonts. This is bounded to the featured projects, deduplicated, and disabled for data saving/2G. Speculative video downloads are avoided.
- Case autoplay is gated before media initialization, rather than after it has already started decoding during the new-page snapshot.
- The visible returning thumbnails request synchronous image painting before the native snapshot. Visual checks caught a decoded-but-not-yet-painted image leaving the animated layer empty. A pixel-level regression check now verifies that the selected photo and its neighbours are present halfway through the return in Chromium and WebKit.
- Sibling-page downloads remain parallel. Late mounts wait until motion has finished, and an explicitly selected page takes priority. Hidden media no longer performs unnecessary layout reads and pause calls.
- Native entry keeps an 80 ms preparation hold, then the same 220 ms thumbnail departure. Text retains its 40 ms offset and 380 ms motion. The 1 px pointer press stays immediate. Return still clears the case in 100 ms; the thumbnail starts at 100 ms and rises over 300 ms.
- The map has a 200 ms preparation period. It renders at 25% layout scale while zoomed out and uses a compositor transform for the camera move, with an 80 ms layer-preparation hold. Rounded clips stay stable. Two rendering frames separate restoring full resolution from starting the text/thumbnail entrance.
- Regression checks also caught a small-phone media-peek issue and insufficient clearance at the intro's preceding loop seam. Those spacing cases were corrected. Two older test expectations were updated for the current title-block credits and Just's two films plus still images.

## Recorded frame evidence

Final compositor run: Chromium, a visible browser window, **1440 × 900 CSS pixels at DPR 2**, Apple M1 Pro, production Vite build. No screenshot/video encoding ran alongside the timing capture.

| Observed window | Drawn frames | Fully dropped, whole window | Fully dropped while animating | Partial-update markers |
| --- | ---: | ---: | ---: | ---: |
| Opening map | 145 | 0 | 0 | 3 |
| Opening thumbnails/text | 100 | 0 | 0 | 0 |
| 10 project entries | 284 | 0 | 0 | 8 |
| 10 returns | 247 | 0 | 0 | 6 |

[Machine-readable compositor counts](compositor.json). Counts deduplicate a frame by layer-tree and frame-sequence ID. A partial-update marker is reported separately, not silently treated as a perfect frame. Windows are delimited by browser user-timing marks. The moving ranges use actual Web Animations start times, delays and durations, also recorded in the trace. Idle/navigation-boundary data is retained too: it includes 19 fully dropped and 6 partial-update markers. The trace alone therefore does not establish perfectly smooth document handoff under every condition.

The last full Retina route matrix measured these `requestAnimationFrame` callback intervals, including the preparation holds:

| Engine / CSS viewport | Entry p95 | Entry worst / intervals >25 ms | Return p95 | Return worst / intervals >25 ms |
| --- | ---: | ---: | ---: | ---: |
| Chromium / 1440 × 900 | 18.6 ms | 66.3 ms / 2 | 18.5 ms | 18.7 ms / 0 |
| Chromium / 390 × 844 | 18.6 ms | 18.7 ms / 0 | 18.6 ms | 18.7 ms / 0 |
| WebKit / 1440 × 900 | 19.0 ms | 31.0 ms / 2 | 19.0 ms | 36.0 ms / 3 |
| WebKit / 390 × 844 | 19.0 ms | 26.0 ms / 1 | 19.0 ms | 26.0 ms / 1 |

[Final route matrix and compositor run](all-visible-photos-timing.json), after correcting selected and neighbouring image painting, exercised all eight cases again. Callback timings are subject to scheduling and timer quantization and are **not measurements of physical display presentation**. The >25 ms threshold identifies a likely missed 60 Hz interval rather than treating small timer jitter above 16.67 ms as a dropped frame.

The final matrix still shows startup outliers: WebKit desktop's map window reaches 97 ms, while its following thumbnail/text entrance stays at or below 22 ms. These setup costs are not hidden in the averages. The earlier [opening-only results](pass7-opening.json) are also retained.

## Pass log

1. [Clean baseline](pass1-clean.json): cold opening and ten entry/return cycles per engine/viewport. Desktop Chromium entry reached 183.3 ms; WebKit desktop return had eleven callback intervals over 25 ms. A separate initial software-rendered diagnostic trace identified raster/decode work; it is not used as a like-for-like hardware comparison.
2. [Idle work and background mounting](pass2.json): stopped continuous spring work, decoded covers and reduced inactive-media work. WebKit desktop return fell to two intervals over 25 ms in this run; mobile-size WebKit had none.
3. [Intent preloading and early autoplay guard](pass3.json): prepared the visible case media for all projects. Mobile-size WebKit entry and return both had no intervals over 25 ms.
4. [Snapshot preparation and stable clips](pass4-clean.json): added the short entry hold and removed animated map corner radii. Extra [Retina validation](retina-final.json) exposed remaining opening and return preparation costs.
5. [Retina return preparation](pass5-final.json): increased the returning thumbnail's preparation hold while retaining the immediate case fade.
6. [Map raster-size experiment](pass6-opening.json): smaller map rendering reduced work but exposed a full-resolution handoff hitch. This intermediate result is retained; it was not accepted as finished.
7. [Opening handoff fix](pass7-opening.json): let full-resolution layout settle before starting the next animation. The subsequent [intermediate compositor run](final-compositor.json) looked good numerically, but visual inspection caught the missing returning photo. Those earlier counts are not accepted as proof of a correct return animation.
8. [Returning-image painting fix](final-painted.json): request synchronous painting for the selected return image, add a photo-pixel test in both engines, and repeat the full Retina matrix. Add the map camera's layer-preparation hold, then [verify actual animation ranges in the final compositor trace](final-ranges.json).

9. [Visible-neighbour painting fix](all-visible-photos-timing.json): the selected image was correct, but the neighbours still appeared after the transition. Apply synchronous painting to every currently visible thumbnail, extend the pixel regression check to a neighbour, inspect the intermediate desktop/mobile screenshots, and rerun the full Retina matrix and compositor trace.

## Regression and visual verification

The complete two-engine/unit run exercised 115 checks: 107 passed initially. The eight failures were the same four cases in each engine: hidden legacy-credit expectations, outdated Just film counts, tiny-phone media visibility and intro seam clearance. After the corrections, all eight passed in focused reruns; the neighbouring forward/reverse clearance tests were also rerun successfully. After the final image-painting fix, eight transition/idle/autoplay checks passed again, including the new photo-pixel assertion in both engines. The final neighbour-photo assertion also passed in both engines. The transition replay, skipped-native-transition fallback, storage denial, keyboard navigation, reduced motion and media playback checks passed.

Before/after desktop and mobile screenshots, intermediate transition frames and the complete raw timing/trace files are preserved locally under:

- `screenshots/2026-09-09_performance-before/`
- `screenshots/2026-09-09_performance-after/`
- `screenshots/2026-09-09_performance-verified/`
- `screenshots/2026-09-09_performance-final-visual/`
- `screenshots/2026-09-09_performance-return-image-check/` — selected photo is present during the return
- `screenshots/2026-09-09_performance-all-visible-photos/` — final selected and neighbouring photos are present during the return
- `screenshots/2026-09-09_performance-phone-before/`
- `screenshots/2026-09-09_performance-<run>/`

Screenshots remain outside Git, as required by the repository's visual-iteration instructions. Small JSON summaries are committed here. These tests emulate viewport and pixel density on a Mac; they do not replace testing on a physical iPhone or a cold production-network connection.

## Reproduce

Run each browser measurement by itself, against a production preview. Do not record video, run builds or run another browser test simultaneously.

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4176
PERF_HEADED=1 PERF_DPR=2 node scripts/performance-transitions.mjs another-run
PERF_HEADED=1 PERF_DPR=2 PERF_ENGINES=chromium PERF_VIEWPORTS=desktop PERF_TRACE=1 node scripts/performance-transitions.mjs another-trace
node scripts/summarize-performance-trace.mjs screenshots/2026-09-09_performance-another-trace/chromium-trace.json
TEST_BROWSERS=chromium,webkit node --test tests/*.test.mjs
node scripts/capture-performance.mjs another-visual-check
```
