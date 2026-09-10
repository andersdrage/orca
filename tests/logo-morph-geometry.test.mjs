import test from 'node:test'
import assert from 'node:assert/strict'
import { glyphGeometry, glyphPath, pocketGeometry, pocketPath } from '../src/logo-morph-geometry.js'

const mix = (a, b, t) => a.map((n, i) => n + (b[i] - n) * t)
const identity = (x, y) => [x, y]
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])

test('letter strokes never cross or invert throughout the original/new morph', () => {
  for (const key of ['f', 'i', 'n-left', 'n-right']) {
    const box = { x: 0, y: 0, width: 13, height: 14 }
    const a = glyphGeometry(key, box, identity, 0), b = glyphGeometry(key, box, identity, 1)
    for (let step = 0; step <= 100; step++) {
      const g = mix(a, b, step / 100)
      const points = Array.from({ length: g.length / 6 }, (_, i) => g.slice(i * 6, i * 6 + 2))
      const area = points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p[0] * q[1] - q[0] * p[1] }, 0)
      assert.ok(area > 0, `${key} lost its winding at ${step}%`)
      for (let i = 0; i < points.length; i++) for (let j = i + 2; j < points.length; j++) {
        if (i === 0 && j === points.length - 1) continue
        const p = points[i], q = points[(i + 1) % points.length], r = points[j], s = points[(j + 1) % points.length]
        assert.ok(!(cross(p, q, r) * cross(p, q, s) < -1e-9 && cross(r, s, p) * cross(r, s, q) < -1e-9), `${key} crossed at ${step}%`)
      }
      assert.ok(!/NaN|Infinity/.test(glyphPath(g)))
    }
  }
})

test('pocket edges stay axis-aligned with curved corners at every intermediate size', () => {
  const a = pocketGeometry({ x: 0, y: 0, width: 85, height: 38 }, 1, identity, 0, false)
  const b = pocketGeometry({ x: 20, y: 0, width: 38, height: 38 }, 1, identity, 2, false)
  for (let step = 0; step <= 100; step++) {
    const path = pocketPath(mix(a, b, step / 100))
    assert.equal((path.match(/H/g) ?? []).length, 2)
    assert.equal((path.match(/V/g) ?? []).length, 2)
    assert.equal((path.match(/C/g) ?? []).length, 4)
    assert.ok(!/NaN|Infinity/.test(path))
  }
})
