# Footer dragon performance — 10 September 2026

The footer now loads prepared geometry, a 512 px finish map and prepared studio
reflections. Browsers no longer triangulate the SVG, generate a 2048 px procedural
texture, or render/convolve the studio environment at startup. The /dragon editor
keeps its original detail and procedural controls.

## Local comparison

Measured with `node scripts/profile-footer.mjs`, using production Vite previews,
Chromium's software WebGL renderer, fresh browser contexts, 2× pixel density,
1440 × 900 and 390 × 844 viewports. Timing starts before scrolling to the footer
and ends when its first rendered frame is ready. One before/after run per viewport;
these are local comparison measurements, not real-device or throttled-network guarantees.

| Metric | Before | After |
| --- | ---: | ---: |
| Desktop footer ready | 5,337 ms | 1,148 ms |
| Mobile-size footer ready | 4,978 ms | 1,184 ms |
| Desktop longest startup task | 2,781 ms | 945 ms |
| Mobile-size longest startup task | 2,470 ms | 1,004 ms |
| Desktop automatic-turn frames/sec | ~9.5 | ~28.8 |
| Mobile-size automatic-turn frames/sec | ~11.3 | ~29.5 |
| Triangles per frame | 76,292 | 17,828 |
| Geometry attribute/index bytes | 7,324,032 | 306,288 |
| Finish map GPU size before mipmaps | 16 MiB | 1 MiB |
| Direct light samples | 16 | 6 |
| Lazy JS, estimated gzip | 188,635 B | 149,431 B |

Each footer frame has two material draw calls; profile draw rates are divided by
two for the frame-rate estimates above. Automatic rotation is capped at 30 fps;
dragging, inertia and recentering can render up to 60 fps. Rendering stops when
no footer is visible and when the tab is hidden. One renderer travels between
footers in the overview instead of allocating a context per page.

The cost of removing startup computation is about **379 KB of additional prepared
assets**: 169 KB mesh, 116 KB finish and 94 KB reflections. These are lazy-loaded,
content-hashed and configured for immutable caching on Vercel. Cold slow-network
performance can differ from the local numbers. No total-download reduction is
claimed; lazy JavaScript is smaller, while total footer download is larger.

The remaining long startup task in software rendering includes shader compilation;
`compileAsync` can use asynchronous driver compilation on supporting devices.

## Maintaining the assets

Run `npm run prepare-footer-dragon` after editing the SVG, footer geometry/settings,
shared finish/studio code, or the preparation script. It starts a temporary local
Vite server and uses Playwright's native SVG parser and WebGL rendering. Mesh
construction and texture preparation happen offline. Commit the generated files
in `src/assets/footer-dragon/` with their source changes.

The mesh uses indexed vertices, 12 curve samples and 8 bevel segments. Position
and normal components use normalized signed 16-bit storage. Maximum position
rounding error is below 0.002 CSS pixels at the 120 px footer size. Reflection
lighting is a 128 px-per-face CubeUV map encoded with shared-exponent RGB values;
the loader reconstructs HDR half-float pixels without running PMREM on the device.
The finish uses lossless WebP after downsampling. The geometry loader handles both
hosts that send gzip Content-Encoding and hosts that serve the packed bytes raw.

`tests/footer-dragon-assets.test.mjs` checks source fingerprints, mesh/texture and
reflection budgets, valid indices and normals, and retained HDR highlights.
Browser checks cover lazy startup, all-axis controls, mouse/touch flick → coast →
center → upright loop, reduced motion, dynamic footer replacement, offscreen
suspension, and fallbacks for unavailable WebGL or mesh assets.

For isolated production checks during other builds, set `DRAGON_TEST_DIST` to a
separate Vite output directory. Both browser test suites and the profile script
accept it. Visual records are under `screenshots/2026-09-10_2033_footer-performance-before/`
and `screenshots/2026-09-10_2042_footer-performance-after/` (local, ignored by Git).

## Arrival and continuous dragging follow-up

The active page now prepares the footer within a 1200 px preload margin, using
the overview column as the observer root where needed. It draws a warm-up frame
offscreen but does not run an offscreen animation loop. On visibility, it joins
the current phase of an eight-second turn immediately, rather than starting from
a front view with a slow ramp. A cold instant jump can still expose the fallback
while assets load; ordinary scrolling gives preparation a head start.

Screen-delta rotation replaces the bounded virtual trackball. One held drag can
continue through multiple revolutions outside the canvas. Pointer capture preserves
the gesture; Shift-drag rolls. After recentering, the center hold is 50 ms and the
rotation ramp is 180 ms. Browser tests now cover full-turn mouse/touch drags and
offscreen preparation in both a project document and a nested overview column.

## Long flick follow-up

Flicks no longer have a 2.1-second cutoff. Release velocity receives a 1.4× impulse
(up to 60 radians/second), with exponential friction of 0.32/s. The dragon returns
only after angular speed falls below 0.3 radians/second, then follows the existing
smooth center/automatic-loop sequence. A strong flick can complete more than
20 revolutions over roughly 16 seconds. Lighter gestures travel less. Grabbing
again cancels the current momentum immediately; reduced-motion behavior is unchanged.
The motion tests compare total travel at 30, 60 and 120 fps, and mouse/touch browser
tests measure cumulative travel through multiple turns before accepting the return.

### Release sampling follow-up

The supplied video showed rotation while dragging with little apparent momentum afterward. A regression gesture reproduced a matching failure: a fast movement followed by six tiny release movements reduced the old event-weighted velocity almost to zero. Release speed now uses angular travel over a rolling 100 ms window; sample durations, rather than the number of pointer events, determine the result. Deliberately slowing, changing direction, holding before release and grabbing again still take over correctly.

Validated with nine motion tests (including trailing movement, 60/120/500 Hz pointer sampling and reversal) and ten production-browser footer tests. Mouse and touch tests now use an accelerating gesture with small trailing movements and check sustained full turns, centering and return to the automatic loop.

### Hold-and-release behaviour

User clarification: the small footer dragon should keep the spin through a hold before release; tiny movements should not create long spins. Removed the 160 ms idle cancellation entirely. A new grab still clears the previous spin, and cancellation/reduced motion still suppress momentum. Release speed is now capped by the gesture's angular travel, with stronger damping for small nudges and the existing long coast for strong throws. Return-to-center and the eight-second idle loop are unchanged.

Regression coverage adds ten repeated releases per input type, including real holds of 700 and 1200 ms, plus checks that a tiny fast nudge settles in under one second of coasting and a full throw survives a two-second hold.
