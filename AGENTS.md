# Visual iteration record

For every user-visible website change, save before and after screenshots in dated,
clearly named folders under `screenshots/`. Include desktop (1440 × 900) and mobile
(390 × 844) views of the affected pages. For animation changes, also capture the
intermediate scroll or transition state. Inspect the resulting images before finishing.

The user uses these captures to showcase the build process. Preserve earlier files;
do not overwrite a previous iteration. Include a short README describing the change.
Screenshots are intentionally local and ignored by Git.

Use `scripts/screenshots.mjs` with `SCREENSHOT_BASE`, `SCREENSHOT_ROUTES`, and
`SCREENSHOT_VIEWPORTS` to target the running preview. Focused viewport captures are
also useful for project intros and sticky scroll effects.
