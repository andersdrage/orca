# Launch-sjekkliste — andersdrage.com

Gjennomgås før lansering. Kryss av med `[x]`.

## Innhold

- [ ] **HMKG-bilder er lavoppløste** — ~740px høye, blir myke i full bredde på retina.
      Høyoppløste kilder: Dropbox `2000 Portfolio/1500 Portefølje/02 Jobber/00 JPGs/010 HMKG`.
      Nye filnavn ved bytte (immutable cache på /images).
- [ ] **Placeholder-intro på Hjemla og Mountain Milk** («Case study in the works») — skriv ekte intro.
- [ ] **To placeholder-tiles igjen** (p5 gul 9:16, p7 rosa 1:1) — fyll med prosjekter eller fjern.
- [ ] Vurder lyd/`Personal notes` for de nye casene (HMKG, Hjemla, Mountain Milk, Humming People).

## Metadata og deling

- [ ] **`og:image` er relativ** (`/images/sharing-img.png`) — må være absolutt URL mot
      produksjonsdomenet, ellers knekker previews i iMessage/Slack/LinkedIn.
- [ ] **Sjekk sharing-img.png** — stemmer den fortsatt med det redesignede uttrykket?
- [ ] **`theme-color` mangler** — velg en tydelig tone (ikke off-white; Safari nekter nær-hvitt).
- [ ] **apple-touch-icon mangler** — 180px PNG av dragen, sentrert på sidens bakgrunnsfarge
      (aldri transparent — iOS gjør den svart).

## Teknisk

- [ ] **Skjul FPS-måleren** (eller flytt den bak S-panelet).
- [ ] **Sjekk ytelsen på mouseover-effektene** (hover-skalering + fjær-label på
      tiles) — profiler at de holder 60fps sammen med elastisk scroll, særlig i Safari.
- [ ] **Vurder S-inspektøren** — ok å la ligge (uoppdagbar), eller fjern.
- [ ] **Domene**: pek andersdrage.com mot Vercel-prosjektet `andersdrage-com`.
- [ ] **Full gjennomkjøring i Safari** (macOS + iOS) — transitions, elastisk scroll, verden.
- [ ] **Mobil-gjennomgang** — tidslinje-touch, case-sider, arkivlista, world-pan på småskjerm.
- [ ] Lighthouse-runde på prod (ytelse + a11y).

## Avklaringer

- [ ] «NSB årsrapport digitalt» sto to ganger under 2016 i arkiv-kilden — én er publisert;
      bekreft om det faktisk var to utgaver.
