# Frontend follow-up — 7 September 2026

Implemented the agreed navigation → mobile → notes → cleanup → media-loading sequence. Original History stays unchanged; DRA-67 remains canceled. Changes are local and uncommitted.

| Issue | Before | After | Why / tradeoff |
| --- | --- | --- | --- |
| [DRA-52](https://linear.app/andersdrage/issue/DRA-52) | Canceling a camera trip restored its destination before sampling | Sample world and every card before cancellation; keep journey guards through landing, reduced motion and map-intro cancellation | Retarget from the visible position using the existing easing |
| [DRA-53](https://linear.app/andersdrage/issue/DRA-53) | World handlers intercepted modified clicks | Shared eligibility check respects modifiers, targets, downloads, fragments, query strings and prevented events | Native browser actions remain available |
| [DRA-56](https://linear.app/andersdrage/issue/DRA-56) | Loop gap could overlap the mobile intro | Reserve the intro width plus its entrance spacing | A larger mobile seam preserves the existing first-project position |
| [DRA-58](https://linear.app/andersdrage/issue/DRA-58) | Missing dimensions and generic 500px placeholders | Build-derived image/poster dimensions and explicit aspect ratios | Stable geometry in Chromium and WebKit; small metadata build step replaces manual ratios |
| [DRA-69](https://linear.app/andersdrage/issue/DRA-69) | Opening/closing keyframes and an uncancelled timer could jump or close a reopened transcript | Interruptible measured-state animation, versioned completion, instant keyboard/reduced-motion paths | Same dialog layout; consistent 220/160ms entrance/exit |
| [DRA-63](https://linear.app/andersdrage/issue/DRA-63) | Read notes was 7px text and roughly 7px high | 12px Maison label, 44px minimum hit area and visible focus | Legible secondary action without altering the main audio pill |
| [DRA-62](https://linear.app/andersdrage/issue/DRA-62) | Failed playback silently returned to Play | Visible/live loading and error status, retry, one pending attempt, 15s stalled-play timeout | Transcript remains available; failed media is reset before retry |
| [DRA-65](https://linear.app/andersdrage/issue/DRA-65) | Obsolete archive timeline mode, multi-case renderer and hidden sticky-title scroll work | Removed their code, empty markup and unused styles | Dedicated archived case routes, arrows, B variants and active design tools remain |
| [DRA-64](https://linear.app/andersdrage/issue/DRA-64) | Stale public files and duplicate source media remained | 41 verified files moved to ignored originals/retired-2026-09-07 | 31,686,090 published bytes and 3,305,044 source bytes removed; originals preserved locally |
| [DRA-59](https://linear.app/andersdrage/issue/DRA-59) | All cases warmed, basement media loaded off screen, below-fold videos played | Active/nearby gallery loading, visibility-driven videos, bounded on-intent preparation and no blanket prerendering | First uncached navigation may need its document; keep hero readiness explicit instead of relying on prerendering |

## Verification and measurements

- Production build and all 65 Chromium/WebKit behavior tests pass. Test output is saved with the local review artifacts.
- All 19 entry routes checked in Chromium, including /logo/ and /404.html; active route image references decoded without failures or uncaught errors.
- Mobile screenshot review: settled homepage, notes control, transcript and audio error. Desktop archive screenshot reviewed. Artifacts: screenshots/frontend-follow-up-2026-09-07/ (ignored locally).
- Existing archive block/2–4 column/lightbox checks, case returns, Uber tabs, denied storage, loading/retry and keyboard focus tests retained.
- Archive contains 115 images plus the Capa video. Case/gallery image proportions come from actual optimized file metadata. An explicit CSS ratio fixes WebKit's pre-decode alt-text sizing behavior.
- Cross-document checks: selected tile → MICROMILSPEC and HMKG → Humming People reached transition-ready with decoded heroes. The cold selected-case probe exposed an early pagereveal; render-blocking module tags are preserved by a post-build HTML hook so the hero exists before capture. See [Chrome's lifecycle guidance](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document).
- scripts/screenshots.mjs now traverses the active world cell instead of only window, and waits for visible image decoding.

Cold local Chromium, 390×844, fresh context per route, six seconds without interaction:

| Route | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| / | 17,528,211 bytes | 2,420,396 bytes | 86% |
| /about/ | 10,714,012 bytes | 2,417,638 bytes | 77% |
| /uber/ | 15,222,300 bytes | 3,486,697 bytes | 77% |

No archive images completed loading on the new cold homepage/About visits. Resource Timing samples are local lab measurements, not field Core Web Vitals or a whole-browser upper bound. Asset cleanup affects deployment size; it is separate from the measured reduction in downloaded media. Retired-file inventory: [retired-assets.json](retired-assets.json).

## Remaining limits

Physical iOS/Safari review remains DRA-29/DRA-30. Modified-event interception is covered in both engines. Native Command-click retained the source page, but the headless/in-app automation did not verify a loaded destination tab; check that final browser behavior manually during DRA-53 review. Reduced-motion coverage here concerns the changed controls and managed videos; The subsequent DRA-61 implementation is documented in [the contrast/motion follow-up](frontend-motion-contrast-2026-09-07.md). No deployment, push or new commit was performed. Source originals are preserved locally in an ignored directory; their prior committed versions also remain in Git history.
