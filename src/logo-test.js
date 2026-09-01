/* /logo-test — 3D-halo av arbeidskort rundt den spinnende drage-logoen.
   Ren CSS 3D-transform (ingen WebGL): hvert kort ligger på en sirkelbane og
   vris progressivt om sin radiale akse — kant-på øverst, fullt ansikt nederst,
   som en mekanisk vifte/vortex. Én rAF-loop driver hele ringen. */

const CARDS = [
  'brathwait-2-card.jpg',
  'finn-3-card.jpg',
  'hjemla-1-full-card.jpg',
  'micromilspec-5-full-card.jpg',
  'hp-2-full-card.jpg',
  'offmarket-2-full-card.jpg',
  'hmkg-2-full-card.jpg',
  'mm-2-card.jpg',
  'misc-nike-card.jpg',
  'boligmappa-cover-2-card.jpg',
  'brathwait-7-card.jpg',
  'finn-8-card.jpg',
  'hjemla-4-full-card.jpg',
  'micromilspec-8-half-card.jpg',
  'hp-8-full-card.jpg',
  'offmarket-6-full-card.jpg',
  'hmkg-4-full-card.jpg',
  'nettavisen-cover-card.jpg',
  'misc-uber-poster-card.jpg',
  'uber-cover-1-card.jpg',
]

const TWO_PI = Math.PI * 2
const REV_SECONDS = 48 // én hel runde — sakte, som et frosset spinn i bevegelse

const halo = document.getElementById('halo')
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

const cards = CARDS.map((file) => {
  const el = document.createElement('div')
  el.className = 'halo__card'
  const img = document.createElement('img')
  img.src = `/images/logo-test/${file}`
  img.alt = ''
  img.loading = 'eager'
  img.decoding = 'async'
  el.appendChild(img)
  halo.appendChild(el)
  return el
})

/* Geometri i px, beregnet fra viewport (vmin) ved resize. */
let radius = 0

function layout() {
  const vmin = Math.min(window.innerWidth, window.innerHeight)
  radius = vmin * 0.36
  const cardW = Math.round(vmin * 0.125)
  const cardH = Math.round(cardW * 1.5)
  const root = document.documentElement.style
  root.setProperty('--card-w', `${cardW}px`)
  root.setProperty('--card-h', `${cardH}px`)
  root.setProperty('--logo-w', `${Math.round(vmin * 0.28)}px`)
}

/* baseAngle = ringens rotasjon. For hvert kort:
   θ = vinkel fra klokka tolv. Posisjon: rotate(θ) + translateY(-R).
   Vridning om radial akse (lokal Y etter rotate): 90° øverst (kant-på,
   tynn sliver) → 0° nederst (fullt ansikt), glatt og periodisk. */
function render(baseAngle) {
  for (let i = 0; i < cards.length; i++) {
    const theta = baseAngle + (i / cards.length) * TWO_PI
    const deg = (theta * 180) / Math.PI
    const twist = 45 * (1 + Math.cos(theta))
    cards[i].style.transform =
      `rotate(${deg}deg) translateY(${-radius}px) rotateY(${twist}deg)`
  }
}

layout()
window.addEventListener('resize', () => {
  layout()
  if (reduceMotion.matches) render(STATIC_OFFSET)
})

/* Halvt steg forskjøvet så ingen kortplass ligger eksakt kant-på øverst. */
const STATIC_OFFSET = Math.PI / CARDS.length

if (reduceMotion.matches) {
  render(STATIC_OFFSET)
} else {
  let start = null
  const tick = (now) => {
    if (start === null) start = now
    const t = (now - start) / 1000
    render(STATIC_OFFSET + (t / REV_SECONDS) * TWO_PI)
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
