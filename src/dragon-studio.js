import * as THREE from 'three'

export const studioDefaults = { light: 1, rotation: -20, key: 1, fill: .22, rim: .7, softbox: 1 }

// Approximate the reference reflections with a broad high-left source,
// restrained fill, edge strips, and large unlit areas between the cards.
const cards = [
  { kind: 'key', position: [-2.8, 3.8, 4], size: [4.8, 2.4], power: 4.8 },
  { kind: 'fill', position: [3.2, -.8, 4], size: [3.4, 4.6], power: 1.8 },
  { kind: 'rim', position: [-3.5, .9, -1.8], size: [1.1, 5.5], power: 4.5 },
  { kind: 'rim', position: [.2, 4.5, -.7], size: [4.8, .9], power: 3.5 },
  // The back stays photographable when spun around, with different card
  // placement rather than the same bright reflection pasted on both faces.
  { kind: 'key', position: [2.8, 2.8, -4.2], size: [3.5, 3], power: 2.8 },
  { kind: 'fill', position: [-2, -2, -4], size: [2.5, 3.5], power: 1.2 },
]

function diffuserTexture() {
  const size = 128, data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = Math.abs((x + .5) / size * 2 - 1), v = Math.abs((y + .5) / size * 2 - 1)
    const value = Math.round(255 * Math.exp(-1.4 * (u ** 8 + v ** 8)))
    const i = (y * size + x) * 4
    data[i] = data[i + 1] = data[i + 2] = value; data[i + 3] = 255
  }
  const texture = new THREE.DataTexture(data, size, size)
  texture.minFilter = texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

export function createStudioEnvironment(renderer, settings, size = 256) {
  const studio = new THREE.Scene()
  studio.background = new THREE.Color().setScalar(.003)
  const texture = diffuserTexture()
  for (const card of cards) {
    const scale = card.kind === 'key' ? settings.softbox : 1
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(card.size[0] * scale, card.size[1] * scale),
      new THREE.MeshBasicMaterial({ map: texture, color: new THREE.Color().setScalar(card.power * settings[card.kind]), side: THREE.DoubleSide }),
    )
    panel.position.set(...card.position); panel.lookAt(0, 0, 0); studio.add(panel)
  }
  const pmrem = new THREE.PMREMGenerator(renderer)
  const target = pmrem.fromScene(studio, .025, .1, 100, { size })
  studio.traverse(object => { object.geometry?.dispose(); object.material?.dispose() })
  texture.dispose(); pmrem.dispose()
  return target
}

// Three.js's rectangular LTC lighting is isotropic. Fixed quadrature samples
// across the close softbox use the physical material's anisotropic direct BRDF,
// so a sunburst highlights differently at each point on the face. Reflection
// cards above provide a continuous source for the polished edges.
export function createStudioLights(scene, compact = false) {
  const lights = []
  const add = (kind, center, dimensions, columns, rows, power) => {
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      const offset = new THREE.Vector3(
        ((column + .5) / columns - .5) * dimensions[0],
        ((row + .5) / rows - .5) * dimensions[1], 0,
      )
      const light = new THREE.PointLight(0xffffff, 0, 0, 2)
      light.userData = { kind, center: new THREE.Vector3(...center), offset, power: power / (columns * rows) }
      scene.add(light); lights.push(light)
    }
  }
  add('key', [-.85, 1.2, 2.2], [2.8, 1.5], compact ? 2 : 4, compact ? 2 : 3, 12)
  add('fill', [1.7, -.5, 2], [1.5, 2], 2, compact ? 1 : 2, 5)
  return lights
}

const orbitAxis = new THREE.Vector3(0, 0, 1)
export function updateStudioLights(lights, settings) {
  const angle = THREE.MathUtils.degToRad(settings.rotation)
  for (const light of lights) {
    const { kind, center, offset, power } = light.userData
    light.position.copy(offset).multiplyScalar(kind === 'key' ? settings.softbox : 1).add(center).applyAxisAngle(orbitAxis, angle)
    light.intensity = power * settings[kind] * settings.light
  }
}
