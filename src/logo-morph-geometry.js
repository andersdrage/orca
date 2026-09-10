// Semantic outlines for the supplied FINN artwork. Pockets retain straight
// edges and elliptical corners; glyph vertices pair stems, arms and diagonals.
const KAPPA = 0.5522847498
const number = n => Number(n.toFixed(5))
const point = (x, y) => `${number(x)},${number(y)}`

export function pocketGeometry(box, scale, normalize, version, left) {
  const [x, y] = normalize(box.x, box.y)
  const small = version === 0 ? [10.5, 10.8] : [1.2, 1.2]
  const topRight = left && version !== 0 ? [version === 1 ? 24.8 : 24.1, version === 1 ? 24.8 : 24.1] : small
  const corners = left ? [...small, ...topRight, 0, 0, ...small] : [...small, ...small, ...small, 0, 0]
  return [x, y, box.width * scale, box.height * scale, ...corners.map(n => n * scale)]
}

export function pocketPath(geometry, outset = 0) {
  let [x, y, width, height, ...r] = geometry
  x -= outset; y -= outset; width += outset * 2; height += outset * 2
  r = r.map(v => v + outset)
  const [ax, ay, bx, by, cx, cy, dx, dy] = r
  const right = x + width, bottom = y + height
  return `M${point(x + ax, y)}H${number(right - bx)}` +
    `C${point(right - bx + bx * KAPPA, y)} ${point(right, y + by - by * KAPPA)} ${point(right, y + by)}` +
    `V${number(bottom - cy)}C${point(right, bottom - cy + cy * KAPPA)} ${point(right - cx + cx * KAPPA, bottom)} ${point(right - cx, bottom)}` +
    `H${number(x + dx)}C${point(x + dx - dx * KAPPA, bottom)} ${point(x, bottom - dy + dy * KAPPA)} ${point(x, bottom - dy)}` +
    `V${number(y + ay)}C${point(x, y + ay - ay * KAPPA)} ${point(x + ax - ax * KAPPA, y)} ${point(x + ax, y)}Z`
}

export function framePath(left, right, thickness) {
  const outset = thickness / 2
  const bottom = left[1] + left[3]
  const a = left[0] + left[2] - outset
  const b = right[0] + outset
  // Fill the shared baseline instead of joining two stroked corners. This
  // prevents the small notch/bump where the pockets meet during interpolation.
  const bridge = `M${point(a, bottom - outset)}H${number(b)}V${number(bottom + outset)}H${number(a)}Z`
  return pocketPath(left, outset) + pocketPath(right, outset) + bridge
}

export function glyphGeometry(key, box, normalize, version) {
  const original = version === 0
  let width, height, vertices, rounding
  if (key.startsWith('n-')) {
    width = original ? 12.9 : 12.6; height = original ? 13.3 : 14.4
    vertices = original
      ? [[0,0],[4.8,0],[7.1,0],[8.1,0],[12.9,0],[12.9,13.3],[8.1,13.3],[8.1,3.9],[4.8,3.9],[4.8,13.3],[0,13.3]]
      : [[0,0],[3.55,0],[8.3,7.1],[8.3,0],[12.6,0],[12.6,14.4],[10.7,14.4],[9.2,14.4],[4.4,7.4],[4.4,14.4],[0,14.4]]
    rounding = original
      ? { 4: [3.2,2.8,.71875,.5], 7: [.8,.8,.75,.75] }
      : { 0: [.8], 1: [.55], 3: [.8], 4: [.8], 5: [.8], 7: [.55], 9: [.8], 10: [.8] }
  } else if (key === 'f') {
    width = original ? 10.1 : 11.6; height = original ? 13.4 : 14.4
    vertices = original
      ? [[0,0],[10.1,0],[10.1,3.9],[4.8,3.9],[4.8,6.5],[10.1,6.5],[10.1,10.4],[4.8,10.4],[4.8,13.4],[0,13.4]]
      : [[0,0],[11.6,0],[11.6,3.9],[4.4,3.9],[4.4,7.2],[10.3,7.2],[10.3,10.9],[4.4,10.9],[4.4,14.4],[0,14.4]]
    rounding = original ? { 0: [2.8,3.2,.5,.71875], 3: [.8,.7,.75,.714286] }
      : { 0: [.8], 1: [.8], 2: [.8], 5: [.8], 6: [.8], 8: [.8], 9: [.8] }
  } else {
    width = box.width; height = box.height
    vertices = [[0,0],[width,0],[width,height],[0,height]]
    rounding = original ? {} : { 0: [.8], 1: [.8], 2: [.8], 3: [.8] }
  }
  const sx = box.width / width, sy = box.height / height
  const [ox, oy] = normalize(0, 0), [ux, uy] = normalize(sx, sy)
  const unit = Math.min(ux - ox, uy - oy)
  return vertices.flatMap(([x, y], i) => {
    const r = rounding[i] ?? [0]
    return [...normalize(box.x + x * sx, box.y + y * sy), r[0] * unit, (r[1] ?? r[0]) * unit, r[2] ?? .5, r[3] ?? .5]
  })
}

export function glyphPath(geometry) {
  const vertices = Array.from({ length: geometry.length / 6 }, (_, i) => geometry.slice(i * 6, i * 6 + 6))
  const count = vertices.length
  const incoming = vertices.map(v => v[2]), outgoing = vertices.map(v => v[3])
  // Adjacent corner trims share the available edge; neither can double back.
  vertices.forEach((v, i) => {
    const next = (i + 1) % count, w = vertices[next]
    const length = Math.hypot(w[0] - v[0], w[1] - v[1])
    const total = outgoing[i] + incoming[next]
    if (total > length && total > 0) {
      outgoing[i] *= length / total
      incoming[next] *= length / total
    }
  })
  const corners = vertices.map((v, i) => {
    const prev = vertices[(i + count - 1) % count], next = vertices[(i + 1) % count]
    const a = Math.hypot(prev[0] - v[0], prev[1] - v[1]) || 1
    const b = Math.hypot(next[0] - v[0], next[1] - v[1]) || 1
    const before = [v[0] + (prev[0] - v[0]) * incoming[i] / a, v[1] + (prev[1] - v[1]) * incoming[i] / a]
    const after = [v[0] + (next[0] - v[0]) * outgoing[i] / b, v[1] + (next[1] - v[1]) * outgoing[i] / b]
    const c1 = before.map((n, axis) => n + (v[axis] - n) * v[4])
    const c2 = after.map((n, axis) => n + (v[axis] - n) * v[5])
    return { before, after, c1, c2 }
  })
  return corners.map((c, i) => `${i ? 'L' : 'M'}${point(...c.before)}C${point(...c.c1)} ${point(...c.c2)} ${point(...c.after)}`).join('') + 'Z'
}

export function shrinkGlyph(geometry) {
  return geometry.map((n, i) => {
    if (i % 6 === 0) return 20 + (n - 20) * .5
    if (i % 6 < 4) return n * .5
    return n
  })
}
