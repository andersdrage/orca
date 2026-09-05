/* /logo — 3D-halo av ekstruderte kort rundt den spinnende drage-logoen.
   WebGL (three.js): ekte rounded-rect-ekstrudering — avrundede hjørner med
   fysisk tykkelse. 40 kort på sirkelbane med kontinuerlig vridning om radial
   akse (kant-på øverst → fullt ansikt nederst), farget etter referansens
   spektrum. Statisk freeze-frame; rotasjon kan legges tilbake ved å animere
   baseAngle i en rAF-loop rundt render().

   Indre/ytre ramme justeres live via DialKit-panelet (logo-test-dials.js). */

import * as THREE from 'three'
import { mountDials } from './logo-test-dials.js'

/* Fast verdens-utstrekning for kamerafittet. Denne er bevisst IKKE koblet
   til ytre ramme: var den det, ville økt ytre radius bare zoomet kameraet
   ut — og da gjør ytre og indre dial i praksis det samme. Med fast skala
   flytter indre ramme hullet og ytre ramme ytterkanten, uavhengig. */
const FIT_WORLD = 1.26

/* Spektret rundt ringen, med klokka fra toppen — hentet fra referansen:
   pink/rød øverst til høyre → oransje/gull nedover siden → hvitt/blått/lilla
   nederst → grønt/gulgrønt opp mot toppen igjen (spranget gulgrønt→pink
   ligger øverst, som i referansen). */
const COLOR_STOPS = [
  [0, '#ff3366'],
  [30, '#ff6633'],
  [60, '#ff9933'],
  [90, '#ffbf40'],
  [120, '#f2d9a6'],
  [150, '#f7f7f2'],
  [180, '#dbe4ff'],
  [210, '#93a5ff'],
  [240, '#7d66ff'],
  [270, '#a08cff'],
  [300, '#4dd2a6'],
  [330, '#7ddc3f'],
  [360, '#c8e83c'],
]

/* Kuraterte arbeidsbilder (public/images/00 logo-test/) — legges på
   kortfrontene som duotone: gråtoneversjonen multipliseres med kortets
   spektrumfarge, så fargen beholdes og bildet blender inn i den. */
const CARD_IMAGES = [
  'hmkg-4-full.jpg',
  'hp-5-full.jpg',
  'micromilspec-6-half.jpg',
  'micromilspec-cover-white.jpg',
  'mm-4-1-3.jpg',
  'uber-cover-1.jpg',
]

let cardTextures = []

function loadCardTextures() {
  return Promise.all(
    CARD_IMAGES.map(
      (file) =>
        new Promise((resolve) => {
          const img = new Image()
          img.onload = () => {
            /* Cover-crop til 2:3 og gråtone via canvas — lysnet litt så
               multipliseringen med kortfargen ikke drukner fargen. */
            const c = document.createElement('canvas')
            c.width = 480
            c.height = 720
            const ctx = c.getContext('2d')
            ctx.filter = 'grayscale(1) contrast(0.9) brightness(1.2)'
            const scale = Math.max(c.width / img.width, c.height / img.height)
            const dw = img.width * scale
            const dh = img.height * scale
            ctx.drawImage(img, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh)
            const t = new THREE.CanvasTexture(c)
            t.colorSpace = THREE.SRGBColorSpace
            t.anisotropy = renderer.capabilities.getMaxAnisotropy()
            resolve(t)
          }
          img.onerror = () => resolve(null)
          img.src = encodeURI(`/images/00 logo-test/${file}`)
        }),
    ),
  )
}

function colorAt(deg) {
  const d = ((deg % 360) + 360) % 360
  let i = 0
  while (i < COLOR_STOPS.length - 2 && COLOR_STOPS[i + 1][0] <= d) i++
  const [d0, c0] = COLOR_STOPS[i]
  const [d1, c1] = COLOR_STOPS[i + 1]
  const t = (d - d0) / (d1 - d0)
  return new THREE.Color(c0).lerp(new THREE.Color(c1), t)
}

/* Rammen i verdensenheter — justerbar via DialKit. Innersirkelen er hellig:
   kortenes innerkant ankres eksakt på indre radius, så hullet i midten er
   en matematisk sirkel. Kortstørrelsen avledes av båndbredden (ytre − indre)
   med fast 2:3-format. */
const frame = {
  inner: 0.8,
  outer: 0.8 + 0.39 * 0.7 * 1.5, // ≈ 1.21, som forrige iterasjon
  count: 40,
}

const dims = {}
function computeDims() {
  dims.cardH = Math.max(frame.outer - frame.inner, 0.05)
  dims.cardW = dims.cardH / 1.5
  dims.cardT = dims.cardW * 0.05
  dims.cornerR = dims.cardW * 0.09
  /* Svak dybdespiral: hvert kort ligger litt nærmere betrakteren enn forrige,
     så overlappen skingler samme vei hele ringen rundt. Perspektiv-
     kompenseres i render() — styrer KUN overlapp-rekkefølgen. */
  dims.spiralDepth = dims.cardT * 45
}

const FOV = 45

const canvas = document.getElementById('halo-canvas')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setClearColor(0x000000, 1)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 20)

/* Mykt frontlys + retningslys skrått ovenfra-venstre så kantene og
   vridningen skygges — det er skyggen som selger tykkelsen. */
scene.add(new THREE.AmbientLight(0xffffff, 0.75))
const key = new THREE.DirectionalLight(0xffffff, 1.4)
key.position.set(-1.5, 2, 3)
scene.add(key)
const fill = new THREE.DirectionalLight(0xffffff, 0.5)
fill.position.set(2, -1, 2)
scene.add(fill)

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0)
  s.lineTo(x + w, y + h - r)
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2)
  s.lineTo(x + r, y + h)
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI)
  s.lineTo(x, y + r)
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5)
  return s
}

/* Én delt geometri: rounded rect ekstrudert til korttykkelse, med en liten
   bevel som gir myk, lysfangende kant hele veien rundt. Bygges på nytt når
   rammen endres i panelet. */
let geometry = null
function rebuildGeometry() {
  const bevel = dims.cardT * 0.35
  const next = new THREE.ExtrudeGeometry(
    roundedRectShape(dims.cardW - bevel * 2, dims.cardH - bevel * 2, dims.cornerR),
    {
      depth: dims.cardT - bevel * 2,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 3,
      curveSegments: 10,
    },
  )
  next.translate(0, 0, -(dims.cardT - bevel * 2) / 2) // sentrer tykkelsen om z=0

  /* ExtrudeGeometry deler i to materialgrupper: 0 = front/bak-flatene,
     1 = kantene. Standard-UV-ene for gruppe 0 er rå shape-koordinater —
     normaliser dem til 0..1 over kortflaten så teksturen fyller kortet. */
  const uv = next.attributes.uv
  const pos = next.attributes.position
  for (const group of next.groups) {
    if (group.materialIndex !== 0) continue
    for (let i = group.start; i < group.start + group.count; i++) {
      uv.setXY(i, pos.getX(i) / dims.cardW + 0.5, pos.getY(i) / dims.cardH + 0.5)
    }
  }
  uv.needsUpdate = true

  for (const card of cards) card.geometry = next
  if (geometry) geometry.dispose()
  geometry = next
}

/* Kort-meshene opprettes/fjernes ved behov når antallet endres i panelet. */
const cards = []
function syncCardCount() {
  while (cards.length < frame.count) {
    /* To materialer per kort: front/bak (med bildetekstur) og kanter (ren
       farge). Fargen settes på begge i render(); teksturen multipliseres
       med fargen → duotone. */
    const frontMat = new THREE.MeshStandardMaterial({
      roughness: 0.45,
      metalness: 0.05,
    })
    const sideMat = new THREE.MeshStandardMaterial({
      roughness: 0.45,
      metalness: 0.05,
    })
    const mesh = new THREE.Mesh(geometry ?? undefined, [frontMat, sideMat])
    mesh.userData.hoverScale = 1
    scene.add(mesh)
    cards.push(mesh)
  }
  while (cards.length > frame.count) {
    const mesh = cards.pop()
    scene.remove(mesh)
    for (const m of mesh.material) m.dispose()
  }
  /* Fordel bildene syklisk over kortene. */
  if (cardTextures.length > 0) {
    for (let i = 0; i < cards.length; i++) {
      const front = cards[i].material[0]
      const tex = cardTextures[i % cardTextures.length]
      if (front.map !== tex) {
        front.map = tex
        front.needsUpdate = true
      }
    }
  }
}

/* Halvt steg forskjøvet så ingen kortplass ligger eksakt kant-på øverst. */
function staticOffset() {
  return Math.PI / cards.length
}

/* Samme transformkjede som CSS-versjonen (rotate(θ) → translateY →
   rotateY(twist)), bygget med intrinsiske Object3D-rotasjoner:
   θ = vinkel fra klokka tolv, med klokka. Vridningen har SAMME fortegn hele
   veien (−90° øverst → 0° nederst → −90° igjen): alle kortene lener samme
   vei, så bunnen ikke speiler seg i to retninger. Kortet er en solid kloss,
   så å se «baksiden» på venstre halvdel er identisk med forsiden. */
function render(baseAngle) {
  for (let i = 0; i < cards.length; i++) {
    const theta = baseAngle + (i / cards.length) * Math.PI * 2
    const deg = (theta * 180) / Math.PI
    const norm = ((deg % 360) + 360) % 360
    const distFromBottom = Math.abs(norm - 180) // 0 nederst, 180 øverst
    /* Eased vridning (cosinus) i stedet for lineær: kurven er FLAT i bunnen,
       så nabokortene der er praktisk talt parallelle — parallelle plan
       skjærer aldri hverandre, og dybdespiralen holder dem adskilt. Med
       lineær vridning (6–7° forskjell per kort) skar nesten-parallelle
       nabokort hverandre i synlige kiler nederst. Nøkkelpunktene er de
       samme: 0° nederst, −45° på sidene, −90° øverst. */
    const distRad = THREE.MathUtils.degToRad(distFromBottom)
    const twist = -(Math.PI / 4) * (1 - Math.cos(distRad))

    /* Perspektiv-kompensasjon for spiraldybden: skaler kortet og den
       radiale avstanden med (camZ − z)/camZ, så projeksjonen på skjermen
       er identisk uansett z — innersirkelen forblir en ekte sirkel og
       alle kortene ser like store ut. */
    /* Spiralen går MED leneretningen (synkende z med økende vinkel): den
       kanten av kortet som svinger bakover dukker under naboen foran, og
       kanten som svinger fremover løfter seg over naboen bak — kortene
       nester seg som lameller. Motsatt retning gir gjennomskjæringskiler. */
    const zOff = (0.5 - norm / 360) * dims.spiralDepth
    const k = (camera.position.z - zOff) / camera.position.z

    const card = cards[i]
    card.position.set(0, 0, 0)
    card.rotation.set(0, 0, 0)
    /* Hover-skala multipliseres inn oppå perspektiv-kompensasjonen. */
    card.scale.setScalar(k * card.userData.hoverScale)
    card.rotateZ(-theta) // CSS-rotate med klokka = negativ om z (y opp her)
    /* Ankre innerkanten (ikke senteret) på innersirkelen; vridningen skjer
       om den radiale aksen gjennom innerkantens midtpunkt, som ligger fast. */
    card.translateY((frame.inner + dims.cardH / 2) * k)
    card.rotateY(twist)
    card.position.z += zOff
    const color = colorAt(norm)
    for (const m of card.material) m.color.copy(color)
  }
  renderer.render(scene, camera)
}

function layout() {
  const w = window.innerWidth
  const h = window.innerHeight
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h)
  camera.aspect = w / h

  /* Fast skala: FIT_WORLD fyller den minste aksen (vmin), uavhengig av
     rammeverdiene — så dial-ene flytter kanter i stedet for å zoome. */
  const halfTan = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
  const minAxisHalfTan = camera.aspect >= 1 ? halfTan : halfTan * camera.aspect
  camera.position.z = FIT_WORLD / minAxisHalfTan
  camera.updateProjectionMatrix()

  const vmin = Math.min(w, h)
  document.documentElement.style.setProperty('--logo-w', `${Math.round(vmin * 0.28)}px`)
}

/* Kalles fra DialKit-panelet når ramme eller antall justeres.
   Rendering skjer i rAF-loopen, så her bare oppdateres geometrien. */
function setFrame(inner, outer, count) {
  frame.inner = inner
  frame.outer = Math.max(outer, inner + 0.05)
  frame.count = Math.max(3, Math.round(count))
  computeDims()
  syncCardCount()
  rebuildGeometry()
}

computeDims()
syncCardCount()
rebuildGeometry()
layout()

/* Teksturene lastes asynkront — kortene står i ren farge til de er klare. */
loadCardTextures().then((textures) => {
  cardTextures = textures.filter(Boolean)
  syncCardCount()
})

window.addEventListener('resize', layout)

mountDials(frame, setFrame)

/* ---- Bevegelse ----
   Rolig kontinuerlig rotasjon (én runde på 90 s) + hover som løfter kortet
   20 %. Verdiene settes direkte per frame i rAF — aldri via transitions.
   prefers-reduced-motion: rotasjonen står i ro; hover (brukerinitiert)
   beholdes. */
const REV_SECONDS = 90
const HOVER_SCALE = 1.2
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

const pointer = new THREE.Vector2(-10, -10) // utenfor scenen til musa flytter seg
const raycaster = new THREE.Raycaster()
window.addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
})

let angle = staticOffset()
let lastT = performance.now()

function tick(now) {
  const dt = Math.min((now - lastT) / 1000, 0.1)
  lastT = now
  if (!reduceMotion.matches) angle += (dt / REV_SECONDS) * Math.PI * 2

  raycaster.setFromCamera(pointer, camera)
  const hit = raycaster.intersectObjects(cards, false)[0]
  const hovered = hit ? hit.object : null

  /* Eksponentiell glatting mot målskala — rask nok til å kjennes direkte,
     myk nok til å ikke poppe. */
  const ease = 1 - Math.exp(-dt * 14)
  for (const card of cards) {
    const target = card === hovered ? HOVER_SCALE : 1
    card.userData.hoverScale += (target - card.userData.hoverScale) * ease
  }

  render(angle)
  requestAnimationFrame(tick)
}

requestAnimationFrame(tick)

/* Debug-krok for verifisering i konsollen (testside). */
window.__logoTestDebug = { cards, pointer, frame, camera, raycaster }
