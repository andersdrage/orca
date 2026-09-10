import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Shape, Path, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three'
import { createDragonGeometry, edgeProfile, profileLimits } from '../src/dragon-geometry.js'

const near = (actual, expected, epsilon = 1e-6) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} ≠ ${expected}`)

test('edge profile has a straight chamfer with circular, tangent fillets at both ends', () => {
  const width = .8, radius = .4
  assert.deepEqual(edgeProfile(0, width, radius), [0, 0])
  assert.deepEqual(edgeProfile(1, width, radius), [width, width])
  for (const t of [.1, .2, .3]) {
    const [x, y] = edgeProfile(t, width, radius)
    near(Math.hypot(x, y - radius), radius)
    const [xx, yy] = edgeProfile(1 - t, width, radius)
    near(Math.hypot(xx - (width - radius), yy - width), radius)
  }
  const a = edgeProfile(.4, width, radius), b = edgeProfile(.6, width, radius)
  near(b[0] - a[0], b[1] - a[1])
  assert.ok(b[0] - a[0] > .2, 'a flat chamfer remains between the fillets')
  const first = edgeProfile(.0001, width, radius), last = edgeProfile(.9999, width, radius)
  assert.ok(first[1] / first[0] < .001, 'first fillet meets the cap tangentially')
  assert.ok((width - last[0]) / (width - last[1]) < .001, 'second fillet meets the wall tangentially')
  for (const t of [0, .2, .5, .8, 1]) near(...edgeProfile(t, width, 0))
})

test('extrusion keeps its total depth and holes through hard, rounded, and zero-chamfer settings', () => {
  const shape = new Shape().moveTo(0, 0).lineTo(20, 0).lineTo(20, 20).lineTo(0, 20).closePath()
  shape.holes.push(new Path().moveTo(8, 8).lineTo(8, 12).lineTo(12, 12).lineTo(12, 8).closePath())
  const material = new MeshBasicMaterial()
  for (const settings of [
    { depth: 1, chamfer: 0, fillet: 0 },
    { depth: 3.2, chamfer: .8, fillet: 0 },
    { depth: 3.2, chamfer: .8, fillet: .4 },
    { depth: 12, chamfer: 1.2, fillet: .8 },
    { depth: 1, chamfer: 1.2, fillet: 1 },
  ]) {
    const geometry = createDragonGeometry([shape], settings)
    geometry.computeBoundingBox()
    near(geometry.boundingBox.max.x - geometry.boundingBox.min.x, 20 * 2 / 77)
    near(geometry.boundingBox.max.y - geometry.boundingBox.min.y, 20 * 2 / 77)
    near(geometry.boundingBox.max.z - geometry.boundingBox.min.z, settings.depth * 2 / 77)
    near(geometry.boundingBox.min.z + geometry.boundingBox.max.z, 0)
    assert.ok(geometry.attributes.position.array.every(Number.isFinite))
    assert.ok(geometry.attributes.normal.array.every(Number.isFinite))
    const mesh = new Mesh(geometry, material)
    mesh.updateMatrixWorld()
    const ray = new Raycaster(new Vector3(0, 0, 3), new Vector3(0, 0, -1))
    assert.equal(ray.intersectObject(mesh).length, 0, 'center hole remains open')
    ray.ray.origin.x = -5 * 2 / 77
    assert.ok(ray.intersectObject(mesh).length > 0, 'front face is outward-facing and solid')
    ray.ray.origin.z = -3; ray.ray.direction.z = 1
    assert.ok(ray.intersectObject(mesh).length > 0, 'back face is also outward-facing')
    geometry.dispose()
  }
  material.dispose()
  assert.ok(profileLimits(1, 1).chamfer * 2 < 1, 'thin extrusions retain a straight wall')
  assert.ok(profileLimits(3.2, .8).fillet < .8, 'fillets cannot consume the whole chamfer')
})

test('chamfer removes volume and recesses the caps without changing the outer dimensions', () => {
  const shape = new Shape().moveTo(0, 0).lineTo(20, 0).lineTo(20, 20).lineTo(0, 20).closePath()
  let previousVolume = Infinity
  for (const chamfer of [0, .2, .55, 1.2]) {
    const geometry = createDragonGeometry([shape], { depth: 3.2, chamfer, fillet: 0 })
    const p = geometry.attributes.position
    let volume = 0
    const a = new Vector3(), b = new Vector3(), c = new Vector3()
    for (let i = 0; i < p.count; i += 3) {
      a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2)
      volume += a.dot(b.cross(c)) / 6
    }
    assert.ok(volume > 0 && volume < previousVolume, 'each larger cut removes actual solid volume')
    previousVolume = volume
    const cap = geometry.groups[0]
    let left = Infinity, right = -Infinity
    for (let i = cap.start; i < cap.start + cap.count; i++) {
      left = Math.min(left, p.getX(i)); right = Math.max(right, p.getX(i))
    }
    near((right - left) * 77 / 2, 20 - 2 * chamfer, 1e-5)
    geometry.computeBoundingBox()
    near((geometry.boundingBox.max.x - geometry.boundingBox.min.x) * 77 / 2, 20, 1e-5)
    geometry.dispose()
  }
})

test('large inward cuts resolve a narrow neck without adding material across concave gaps', () => {
  const outline = [[0, 0], [10, 0], [10, 4.5], [20, 4.5], [20, 0], [30, 0], [30, 10], [20, 10], [20, 5.5], [10, 5.5], [10, 10], [0, 10]]
  const shape = new Shape(outline.map(([x, y]) => ({ x, y })))
  for (const fillet of [0, .8]) {
    const geometry = createDragonGeometry([shape], { depth: 3.2, chamfer: 1.2, fillet })
    const p = geometry.attributes.position
    assert.ok(p.array.every(Number.isFinite))
    assert.ok(geometry.attributes.normal.array.every(Number.isFinite))
    const inside = (x, y) => x >= -1e-4 && x <= 30.0001 && y >= -1e-4 && y <= 10.0001 &&
      (x <= 10.0001 || x >= 19.9999 || (y >= 4.4999 && y <= 5.5001))
    for (let i = 0; i < p.count; i += 3) {
      const triangle = [i, i + 1, i + 2].map(j => [p.getX(j) * 77 / 2 + 15, -p.getY(j) * 77 / 2 + 5])
      for (const [x, y] of [...triangle, [triangle.reduce((n, v) => n + v[0], 0) / 3, triangle.reduce((n, v) => n + v[1], 0) / 3]]) {
        assert.ok(inside(x, y), `surface must stay inside original silhouette: ${x}, ${y}`)
      }
    }
    geometry.dispose()
  }
})

test('curved fillets have sloped triangles and continuous normals instead of terraces', () => {
  const shape = new Shape()
  shape.absarc(0, 0, 10, 0, Math.PI * 2, false)
  const geometry = createDragonGeometry([shape], { depth: 4, chamfer: 1, fillet: .6 })
  const p = geometry.attributes.position, n = geometry.attributes.normal
  const a = new Vector3(), b = new Vector3(), c = new Vector3(), normal = new Vector3(), smooth = new Vector3()
  let triangles = 0
  for (let i = geometry.groups[1].start; i < p.count; i += 3) {
    // Front bevel only: the straight wall ends one unit from the middle.
    if ([i, i + 1, i + 2].some(j => p.getZ(j) < 2 / 77 - 1e-7)) continue
    assert.ok(!(p.getZ(i) === p.getZ(i + 1) && p.getZ(i) === p.getZ(i + 2)), 'no horizontal terraces in the curved bevel')
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2)
    normal.copy(b).sub(a).cross(c.sub(a)).normalize()
    smooth.set(0, 0, 0)
    for (let j = 0; j < 3; j++) smooth.add(a.fromBufferAttribute(n, i + j))
    assert.ok(normal.dot(smooth.normalize()) > Math.cos(Math.PI / 30), 'the mesh surface agrees with its shading normals within six degrees')
    triangles++
  }
  assert.ok(triangles > 100)
  const seen = new Map()
  for (let i = 0; i < p.count; i++) {
    const key = [p.getX(i), p.getY(i), p.getZ(i)].join(',')
    const current = new Vector3().fromBufferAttribute(n, i), previous = seen.get(key)
    if (previous) assert.ok(current.distanceTo(previous) < 1e-5, 'no normal seam between the cap, fillet bands and curved wall')
    seen.set(key, current)
  }
  geometry.dispose()
})
