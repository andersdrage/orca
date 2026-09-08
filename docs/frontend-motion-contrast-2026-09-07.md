# Contrast and reduced motion — 7 September 2026

Local follow-up for DRA-57 and DRA-61. Changes remain uncommitted, alongside the preceding audit batch.

| Issue | Before | After | Benefit / tradeoff |
| --- | --- | --- | --- |
| DRA-57 | Light gray metadata, white small text on orange, and 30% opacity for inactive rows | Shared secondary color #666670; dark archive-card metadata; inactive rows change color while hovered/focused rows retain their hierarchy | 5.44:1 on #fafafa and 5.72:1 on #ff5c00. Labels are visibly darker; fonts, spacing, orange background and large white heading remain |
| DRA-61 | Timeline arrow keys always scrolled smoothly; lightbox loops lacked a pause control | Immediate timeline steps under reduced motion; posters by default; case/lightbox Play/Pause buttons; preference changes stop playback | Intentional case playback remains available. Small visible controls add a way to stop motion; a manual pause survives scrolling |

The existing visible-media manager also pauses footer/gallery loops when reduced motion is requested. The logo experiment now follows the preference for its video as well. The error-page mark already followed the preference. Normal camera/cover easing is unchanged.

Case video figures now reserve their width from the known poster ratio: Chrome could otherwise collapse a deferred video to zero width inside a fit-content figure. This also keeps the Play button visible before loading.

## Verification

- Production build and 73/73 regression tests passed across Chromium and WebKit (no skips).

- Additional Chromium check: the /logo experiment starts still, plays when reduced motion is turned off, and pauses when it is turned back on. Its existing animation loop also synchronizes the preference if a change event is delayed.
- Browser checks cover History, About, Praise, People, FINN and Archived work at 1440 px and 390 px, including row hover and footer hover/focus.
- Computed contrast tests cover shared metadata, credit labels/names, employment rows, Praise/People secondary copy and the orange card.
- Keyboard tests cover immediate timeline steps, reduced-motion video playback, pause persistence, preference changes during playback and lightbox focus return.
- Footer playback is checked after actually revealing it by scrolling its world cell. Sticky geometry alone is insufficient.
- Screenshots: `screenshots/frontend-motion-contrast-2026-09-07/`. History, archive and FINN examples are attached to Linear.

Physical iOS and screen-reader review remain separate audit work. This is targeted contrast verification, not a claim that every possible text/media combination across the site meets WCAG. No push or deployment was performed.
