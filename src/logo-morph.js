import { cubicBezier } from 'motion'

const NS = 'http://www.w3.org/2000/svg'
const KEYS = ['outer-frame-white', 'left-pocket', 'right-pocket', 'f', 'i', 'n-left', 'n-right']
const LABELS = ['Original', 'New', 'Mobile']
const SAMPLES = 192
const morphEase = cubicBezier(0.77, 0, 0.175, 1)
const directEase = cubicBezier(0.22, 1, 0.36, 1)

const pathData = el => el.tagName.toLowerCase() === 'rect'
  ? `M${el.x.baseVal.value},${el.y.baseVal.value}h${el.width.baseVal.value}v${el.height.baseVal.value}h-${el.width.baseVal.value}Z`
  : el.getAttribute('d')
const polygon = points => `M${points.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join('L')}Z`
const area = points => points.reduce((sum, p, i) => {
  const q = points[(i + 1) % points.length]
  return sum + p[0] * q[1] - q[0] * p[1]
}, 0)

// Pair the four corners before resampling each side. Perimeter-only matching
// would slide rectangle corners along their edges when the mobile pocket narrows.
function pocketPoints(path, length, normalize) {
  const count = 1536
  let points = Array.from({ length: count }, (_, i) => {
    const p = path.getPointAtLength(length * i / count)
    return [p.x, p.y]
  })
  if (area(points) < 0) points.reverse()
  const box = path.getBBox()
  const corners = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, y]) => {
    let best = 0, cost = Infinity
    points.forEach((p, i) => {
      const distance = ((p[0] - box.x) / box.width - x) ** 2 + ((p[1] - box.y) / box.height - y) ** 2
      if (distance < cost) { cost = distance; best = i }
    })
    return best
  })
  return corners.flatMap((start, side) => {
    const distance = (corners[(side + 1) % 4] - start + count) % count
    return Array.from({ length: SAMPLES / 4 }, (_, i) => {
      const at = start + distance * i / (SAMPLES / 4)
      const a = points[Math.floor(at) % count], b = points[(Math.floor(at) + 1) % count]
      const t = at % 1
      return normalize(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
    })
  })
}

// Match contour direction and start point, so letters reshape without twisting.
function align(points, reference) {
  if (Math.sign(area(points)) !== Math.sign(area(reference))) points.reverse()
  let best = 0
  let cost = Infinity
  for (let offset = 0; offset < points.length; offset++) {
    let distance = 0
    for (let i = 0; i < points.length; i++) {
      const p = points[(i + offset) % points.length]
      distance += (p[0] - reference[i][0]) ** 2 + (p[1] - reference[i][1]) ** 2
    }
    if (distance < cost) { cost = distance; best = offset }
  }
  return points.slice(best).concat(points.slice(0, best))
}

function readStates(group) {
  const source = group.querySelector('[data-logo-source]').content.querySelector('svg').cloneNode(true)
  source.style.cssText = 'position:fixed;width:1px;height:1px;visibility:hidden;pointer-events:none'
  group.append(source)
  try {
    const states = ['old-logo', 'new-logo', 'mobile-logo'].map(id => {
      const logo = source.querySelector(`#${id}`)
      const box = logo.getBBox()
      const scale = 42 / box.height
      const cx = box.x + box.width / 2
      const cy = box.y + box.height / 2
      const normalize = (x, y) => [(x - cx) * scale, (y - cy) * scale]
      const ns = [...logo.children].filter(el => (el.dataset.name ?? el.id) === 'n')
        .sort((a, b) => a.getBBox().x - b.getBBox().x)
      // Illustrator disambiguates repeated n IDs; match the two letters spatially.
      if (ns.length < 2) {
        ns.splice(0, ns.length, ...[...logo.children].filter(el => /^n\d*$/.test(el.id))
          .sort((a, b) => a.getBBox().x - b.getBBox().x))
      }
      return KEYS.map(key => {
        const el = key.startsWith('n-') ? ns[key === 'n-left' ? 0 : 1]
          : [...logo.children].find(el => (el.dataset.name ?? el.id) === key)
        if (!el) return null
        let d = pathData(el)
        // Pockets cover the frame's inner cutouts. Morph only its outer contour,
        // then paint the matching pockets on top, preserving a clean white rim.
        if (key === 'outer-frame-white') d = d.match(/^[Mm][^Mm]+/)[0]
        if (!/[zZ]\s*$/.test(d)) d += 'Z'
        const path = document.createElementNS(NS, 'path')
        path.setAttribute('d', d)
        source.append(path)
        const length = path.getTotalLength()
        const points = key.endsWith('pocket') ? pocketPoints(path, length, normalize) : Array.from({ length: SAMPLES }, (_, i) => {
          const p = path.getPointAtLength(length * i / SAMPLES)
          return normalize(p.x, p.y)
        })
        path.remove()
        const hex = el.getAttribute('fill').replace('#', '')
        const color = (hex.length === 3 ? [...hex].map(c => c + c).join('') : hex).match(/../g).map(c => parseInt(c, 16))
        const left = [...logo.children].find(el => (el.dataset.name ?? el.id) === 'left-pocket')
        const border = key === 'outer-frame-white' ? (left.getBBox().x - box.x) * scale * 2 : 0
        return { d, transform: `matrix(${scale} 0 0 ${scale} ${-cx * scale} ${-cy * scale})`, points, color, opacity: 1, border }
      })
    })
    for (let k = 0; k < KEYS.length; k++) {
      if (!KEYS[k].endsWith('pocket')) states[1][k].points = align(states[1][k].points, states[0][k].points)
      if (states[2][k]) {
        if (!KEYS[k].endsWith('pocket')) states[2][k].points = align(states[2][k].points, states[0][k].points)
      }
      else {
        // The mobile asset has no lettering. Tuck it inside the narrowing pocket.
        states[2][k] = { ...states[1][k], opacity: 0,
          points: states[1][k].points.map(([x, y]) => [20 + (x - 20) * 0.5, y * 0.5]) }
      }
    }
    return states
  } finally { source.remove() }
}

export function initLogoMorph(root) {
  const group = root.querySelector('[data-logo-morph]')
  if (!group) return () => {}
  const lifetime = new AbortController()
  const { signal } = lifetime
  const states = readStates(group)
  const svg = group.querySelector('.finn-logo-morph__art')
  const drawing = group.querySelector('[data-logo-drawing]')
  const panel = group.querySelector('[role="tabpanel"]')
  const bar = group.querySelector('[role="tablist"]')
  const tabs = [...bar.querySelectorAll('[role="tab"]')]
  const pill = bar.querySelector('.t-tabs-pill')
  const reduce = matchMedia('(prefers-reduced-motion: reduce)')
  const paths = KEYS.map(key => {
    const path = document.createElementNS(NS, 'path')
    path.dataset.logoLayer = key
    drawing.append(path)
    return path
  })
  let active = 0
  let current = states[0]
  let animation = null
  let frame = 0
  let lastTime = null
  let hold = 0
  let visible = false
  let manual = false

  function render(state, exact = false) {
    current = state
    paths.forEach((path, k) => {
      const shape = state[k]
      path.setAttribute('d', exact ? shape.d : polygon(shape.points))
      path.setAttribute('transform', exact ? shape.transform : '')
      path.setAttribute('fill', `rgb(${shape.color.map(Math.round).join(',')})`)
      path.setAttribute('opacity', String(shape.opacity))
      if (k === 0) {
        // The source frame is the offset outline of its two pockets. Reuse those
        // same contours in flight so the white rim can never detach or pinch.
        if (!exact) path.setAttribute('d', polygon(state[1].points) + polygon(state[2].points))
        path.setAttribute('stroke', exact ? 'none' : '#fff')
        path.setAttribute('stroke-width', exact ? '0' : String(shape.border))
        path.setAttribute('stroke-linejoin', 'round')
      }
    })
  }

  function positionPill(animate = false) {
    pill.style.transition = animate && !reduce.matches ? '' : 'none'
    pill.style.width = `${tabs[active].offsetWidth}px`
    pill.style.transform = `translateX(${tabs[active].offsetLeft}px)`
  }

  function choose(index, animate = true, automatic = false) {
    active = index
    group.dataset.logoState = LABELS[index].toLowerCase()
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index))
      tab.tabIndex = i === index ? 0 : -1
    })
    panel.setAttribute('aria-labelledby', tabs[index].id)
    svg.setAttribute('aria-label', `${LABELS[index]} FINN logo`)
    positionPill(animate)
    animation = animate && !reduce.matches ? {
      from: current, to: states[index], elapsed: 0,
      duration: automatic ? 1050 : 550, ease: automatic ? morphEase : directEase,
    } : null
    group.dataset.animating = String(Boolean(animation))
    if (!animation) render(states[index], true)
    hold = 1400
    wake()
  }

  function canRun() { return !signal.aborted && visible && !document.hidden && !reduce.matches }
  function tick(time) {
    frame = 0
    if (reduce.matches) { settleMotion(); return }
    if (!canRun()) { lastTime = null; return }
    const delta = lastTime === null ? 0 : time - lastTime
    lastTime = time
    if (animation) {
      animation.elapsed += delta
      const progress = Math.min(1, animation.elapsed / animation.duration)
      const t = animation.ease(progress)
      render(animation.from.map((a, k) => {
        const b = animation.to[k]
        return {
          points: a.points.map((p, i) => p.map((v, axis) => v + (b.points[i][axis] - v) * t)),
          color: a.color.map((v, i) => v + (b.color[i] - v) * t),
          opacity: a.opacity + (b.opacity - a.opacity) * t,
          border: a.border + (b.border - a.border) * t,
        }
      }))
      if (progress === 1) {
        render(states[active], true)
        animation = null
        group.dataset.animating = 'false'
      }
    } else if (!manual) {
      hold -= delta
      if (hold <= 0) choose((active + 1) % states.length, true, true)
    }
    if (animation || !manual) wake()
    else lastTime = null
  }
  function wake() {
    if (canRun() && !frame && (animation || !manual)) frame = requestAnimationFrame(tick)
  }
  function suspend() { cancelAnimationFrame(frame); frame = 0; lastTime = null }
  function settleMotion() {
    suspend()
    animation = null
    render(states[active], true)
    group.dataset.animating = 'false'
    positionPill()
  }
  function takeControl() {
    manual = true
    group.dataset.autoplay = 'off'
    if (!animation) suspend()
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', event => { takeControl(); choose(index, event.detail > 0) }, { signal })
    tab.addEventListener('keydown', event => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const next = { ArrowRight: (index + 1) % 3, ArrowLeft: (index + 2) % 3, Home: 0, End: 2 }[event.key]
      if (next === undefined) return
      event.preventDefault()
      takeControl()
      choose(next, false)
      tabs[next].focus({ preventScroll: true })
    }, { signal })
  })
  bar.addEventListener('focusin', takeControl, { signal })
  document.addEventListener('visibilitychange', () => { suspend(); wake() }, { signal })
  reduce.addEventListener('change', () => {
    suspend()
    if (reduce.matches) settleMotion()
    else wake()
  }, { signal })
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.15
    suspend()
    if (reduce.matches) settleMotion()
    else wake()
  }, { threshold: [0, 0.15] })
  const resize = new ResizeObserver(() => positionPill())
  resize.observe(bar)
  render(states[0], true)
  group.dataset.logoState = 'original'
  group.dataset.animating = 'false'
  group.dataset.autoplay = 'on'
  group.dataset.ready = 'true'
  positionPill()
  document.fonts.ready.then(() => { if (!signal.aborted) positionPill() })
  observer.observe(group)
  return () => { lifetime.abort(); suspend(); observer.disconnect(); resize.disconnect() }
}
