import * as THREE from 'three'
import { DragonMotion } from './dragon-motion.js'
import { loadFooterGeometry, loadFooterFinish, loadFooterEnvironment } from './footer-dragon-assets.js'
import { footerDragonSettings } from './footer-dragon-settings.js'
import { createDragonFinish } from './dragon-finish.js'
import { createStudioLights, updateStudioLights } from './dragon-studio.js'

// One scene/context travels between footers as the overview mounts new pages.
export async function createFooterDragon() {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  let finish, environment, geometry, texture
  try {
    const settings = footerDragonSettings
    // These assets are generated once during development, never per visitor.
    // allSettled keeps cleanup deterministic if either resource fails.
    const resources = await Promise.allSettled([loadFooterGeometry(), loadFooterFinish(), loadFooterEnvironment()])
    geometry = resources[0].status === 'fulfilled' ? resources[0].value : null
    texture = resources[1].status === 'fulfilled' ? resources[1].value : null
    environment = resources[2].status === 'fulfilled' ? resources[2].value : null
    if (!geometry || !texture || !environment) throw new Error('Dragon assets unavailable')
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    finish = createDragonFinish(renderer, settings, texture)
    const scene = new THREE.Scene()
    scene.environment = environment
    scene.environmentIntensity = settings.light
    scene.environmentRotation.z = THREE.MathUtils.degToRad(settings.rotation)
    updateStudioLights(createStudioLights(scene, true), settings)
    const dragon = new THREE.Mesh(geometry, finish.materials)
    scene.add(dragon)
    // Square orthographic framing leaves room for every orientation.
    const camera = new THREE.OrthographicCamera(-1.34, 1.34, 1.34, -1.34, .1, 100)
    camera.position.z = 10
    renderer.toneMapping = THREE.AgXToneMapping
    renderer.setClearColor(0, 0)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.setSize(120, 120, false)
    await renderer.compileAsync(scene, camera)
    const canvas = renderer.domElement
    canvas.className = 'footer-dragon-canvas'
    canvas.tabIndex = 0
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', 'Interactive dragon. Drag or flick to spin. Arrow keys rotate; Q and E roll; Home centers.')
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const motion = new DragonMotion(dragon.quaternion, reduced.matches)
    let visible = false
    let host = null, frame = 0, last = 0, pointer = null, failed = false
    const delta = new THREE.Quaternion()
    const request = () => { if (host && visible && !failed && !document.hidden && !frame) frame = requestAnimationFrame(render) }
    function render(now) {
      frame = 0
      // The slow decorative turn needs fewer GPU frames. Direct manipulation,
      // momentum and the return remain responsive, including on 120 Hz screens.
      const interval = 1000 / (motion.mode === 'auto' ? 30 : 60)
      if (last && now - last < interval - .5) { request(); return }
      const dt = Math.min((now - (last || now)) / 1000, .1)
      last = now
      motion.advance(dt)
      paint()
      if (motion.animated) request()
    }
    function paint() {
      renderer.render(scene, camera)
      canvas.dataset.rotation = dragon.quaternion.toArray().map(n => n.toFixed(5)).join(',')
      canvas.dataset.motion = motion.mode
      canvas.dataset.ready = 'true'
    }
    function halt() {
      cancelAnimationFrame(frame); frame = 0; last = 0
      const captured = pointer
      pointer = null
      if (captured) {
        motion.release(true)
        if (canvas.hasPointerCapture(captured.id)) canvas.releasePointerCapture(captured.id)
      }
    }
    canvas.addEventListener('pointerdown', e => {
      if (e.button !== 0 || pointer) return
      e.preventDefault()
      pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, time: e.timeStamp, radiansPerPixel: Math.PI * 2 / (canvas.getBoundingClientRect().width * 1.5) }
      motion.beginDrag()
      canvas.setPointerCapture(e.pointerId)
    })
    const move = e => {
      if (pointer?.id !== e.pointerId) return
      const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y
      const amount = pointer.radiansPerPixel
      // Unbounded screen deltas let one long drag complete multiple turns.
      // Unlike a virtual sphere, movement does not flatten at the canvas edge.
      delta.setFromEuler(new THREE.Euler(e.shiftKey ? 0 : dy * amount, e.shiftKey ? 0 : dx * amount, e.shiftKey ? dx * amount : 0, 'YXZ'))
      const moved = motion.drag(delta, (e.timeStamp - pointer.time) / 1000)
      pointer = { ...pointer, x: e.clientX, y: e.clientY, time: moved ? e.timeStamp : pointer.time }
      request()
    }
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('dragstart', e => e.preventDefault())
    const release = e => {
      if (pointer?.id !== e.pointerId) return
      // A very fast gesture can place its final position on pointerup itself.
      if (e.type === 'pointerup') move(e)
      motion.release(e.type !== 'pointerup')
      pointer = null
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
      last = 0
      request()
    }
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, release)
    canvas.addEventListener('keydown', e => {
      const rotations = { ArrowUp: [1, 0, 0], ArrowDown: [-1, 0, 0], ArrowLeft: [0, -1, 0], ArrowRight: [0, 1, 0], q: [0, 0, 1], e: [0, 0, -1] }
      if (!rotations[e.key] && e.key !== 'Home') return
      e.preventDefault()
      if (e.key === 'Home') motion.returnToCenter()
      else {
        motion.beginDrag()
        motion.drag(delta.setFromAxisAngle(new THREE.Vector3(...rotations[e.key]), Math.PI / 12), .1)
        if (reduced.matches) motion.mode = 'rest'
        else motion.release(true)
      }
      request()
    })
    reduced.addEventListener('change', () => { halt(); motion.reduced = reduced.matches; motion.returnToCenter(); request() })
    document.addEventListener('visibilitychange', () => { halt(); request() })
    window.addEventListener('pagehide', halt)
    window.addEventListener('pageshow', request)
    const resize = new ResizeObserver(() => {
      if (!host) return
      const size = Math.max(1, Math.round(host.clientWidth))
      renderer.setSize(size, size, false)
      if (visible) request(); else paint()
    })
    function mount(next, nextVisible = true) {
      if (failed) return
      if (next === host) {
        if (visible === nextVisible) return
        visible = nextVisible
        halt()
        if (visible) { motion.joinLoop(performance.now() / 1000); request() }
        return
      }
      halt(); resize.disconnect()
      visible = nextVisible
      if (host) {
        host.querySelector('img').hidden = false
        host.setAttribute('aria-hidden', 'true')
      }
      canvas.remove(); host = next
      if (host) {
        host.removeAttribute('aria-hidden')
        host.append(canvas)
        host.querySelector('img').hidden = true
        motion.joinLoop(performance.now() / 1000)
        resize.observe(host)
        paint() // Upload and draw once during preloading; no offscreen loop.
        request()
      }
    }
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); mount(null); failed = true
      geometry.dispose(); finish.dispose(); environment.dispose(); renderer.dispose()
    })
    return { mount }
  } catch (error) {
    geometry?.dispose(); if (finish) finish.dispose(); else texture?.dispose(); environment?.dispose(); renderer.dispose()
    throw error
  }
}
