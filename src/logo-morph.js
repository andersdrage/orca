import { cubicBezier } from 'motion'
import { pocketGeometry, pocketPath, framePath, glyphGeometry, glyphPath, shrinkGlyph } from './logo-morph-geometry.js'

const NS = 'http://www.w3.org/2000/svg'
const KEYS = ['outer-frame-white', 'left-pocket', 'right-pocket', 'f', 'i', 'n-left', 'n-right']
const LABELS = ['Original', 'New', 'Mobile']
const morphEase = cubicBezier(0.77, 0, 0.175, 1)
const directEase = cubicBezier(0.22, 1, 0.36, 1)

// Illustrator may drop data-name on re-save and retain only suffixed IDs.
const layerName = el => el.dataset.name || el.id.replace(/\d+$/, '')

const pathData = el => el.tagName.toLowerCase() === 'rect'
  ? `M${el.x.baseVal.value},${el.y.baseVal.value}h${el.width.baseVal.value}v${el.height.baseVal.value}h-${el.width.baseVal.value}Z`
  : el.getAttribute('d')
function readStates(group) {
  const source = group.querySelector('[data-logo-source]').content.querySelector('svg').cloneNode(true)
  source.style.cssText = 'position:fixed;width:1px;height:1px;visibility:hidden;pointer-events:none'
  group.append(source)
  try {
    const states = ['old-logo', 'new-logo', 'mobile-logo'].map((id, version) => {
      const logo = source.querySelector(`#${id}`)
      const box = logo.getBBox()
      const scale = 42 / box.height
      const cx = box.x + box.width / 2
      const cy = box.y + box.height / 2
      const normalize = (x, y) => [(x - cx) * scale, (y - cy) * scale]
      // Match repeated letters spatially, regardless of Illustrator's ID suffix.
      const ns = [...logo.children].filter(el => layerName(el) === 'n')
        .sort((a, b) => a.getBBox().x - b.getBBox().x)
      return KEYS.map(key => {
        const el = key.startsWith('n-') ? ns[key === 'n-left' ? 0 : 1]
          : [...logo.children].find(el => layerName(el) === key)
        if (!el) return null
        let d = pathData(el)
        // Pockets cover the frame's inner cutouts. Morph only its outer contour,
        // then paint the matching pockets on top, preserving a clean white rim.
        if (key === 'outer-frame-white') d = d.match(/^[Mm][^Mm]+/)[0]
        if (!/[zZ]\s*$/.test(d)) d += 'Z'
        const geometry = key === 'outer-frame-white' ? [] : key.endsWith('pocket')
          ? pocketGeometry(el.getBBox(), scale, normalize, version, key === 'left-pocket')
          : glyphGeometry(key, el.getBBox(), normalize, version)
        const hex = el.getAttribute('fill').replace('#', '')
        const color = (hex.length === 3 ? [...hex].map(c => c + c).join('') : hex).match(/../g).map(c => parseInt(c, 16))
        const left = [...logo.children].find(el => layerName(el) === 'left-pocket')
        const border = key === 'outer-frame-white' ? (left.getBBox().x - box.x) * scale * 2 : 0
        return { d, transform: `matrix(${scale} 0 0 ${scale} ${-cx * scale} ${-cy * scale})`, geometry, color, opacity: 1, border }
      })
    })
    for (const state of states) {
      // Illustrator's rounded coordinates differ by a tenth of a unit. Keep
      // both bottoms exactly aligned while moving, so the white base stays flat.
      const baseline = (state[1].geometry[1] + state[1].geometry[3] + state[2].geometry[1] + state[2].geometry[3]) / 2
      for (const k of [1, 2]) state[k].geometry[3] = baseline - state[k].geometry[1]
    }
    for (let k = 3; k < KEYS.length; k++) {
      states[2][k] = { ...states[1][k], opacity: 0, geometry: shrinkGlyph(states[1][k].geometry) }
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
      const d = k === 0 ? framePath(state[1].geometry, state[2].geometry, shape.border)
        : k < 3 ? pocketPath(shape.geometry) : glyphPath(shape.geometry)
      path.setAttribute('d', exact ? shape.d : d)
      path.setAttribute('transform', exact ? shape.transform : '')
      path.setAttribute('fill', `rgb(${shape.color.map(Math.round).join(',')})`)
      path.setAttribute('opacity', String(shape.opacity))

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
          geometry: a.geometry.map((v, i) => v + (b.geometry[i] - v) * t),
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
