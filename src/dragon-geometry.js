import { BufferGeometry, Float32BufferAttribute, ShapeUtils, Vector2 } from 'three'
import ClipperLib from 'clipper-lib'
import cdt2d from 'cdt2d'

export function profileLimits(depth, chamfer) {
  const width = Math.min(1.2, depth * .45)
  return { chamfer: width, fillet: Math.floor(Math.min(chamfer, width) * .85 * 100) / 100 }
}

// Cross-section measured outward from the cap, and downward toward the wall.
// Two circular 45° arcs surround a genuinely straight 45° chamfer. Radius 0
// restores a hard chamfer; total width/drop stays constant as radius changes.
export function edgeProfile(t, width, radius) {
  if (radius === 0) return [width * t, width * t]
  if (t <= .375) {
    const angle = t / .375 * Math.PI / 4
    return [radius * Math.sin(angle), radius * (1 - Math.cos(angle))]
  }
  if (t >= .625) {
    const angle = (1 - t) / .375 * Math.PI / 4
    return [width - radius + radius * Math.cos(angle), width - radius * Math.sin(angle)]
  }
  const along = (t - .375) / .25 * (width - radius)
  return [radius * Math.SQRT1_2 + along, radius * (1 - Math.SQRT1_2) + along]
}

// Integer polygon offsets resolve narrow tips and merging inset boundaries.
// Each band is the difference between two nested cross-sections, so no surface
// can grow outside the original solid when a local feature becomes too narrow.
const precision = 100000
const { Clipper, ClipperOffset, PolyTree, PolyType, PolyFillType, ClipType, JoinType, EndType } = ClipperLib
const key = p => `${p.X},${p.Y}`

function booleanTree(subject, clip = [], operation = ClipType.ctUnion) {
  const engine = new Clipper(), tree = new PolyTree()
  engine.AddPaths(subject, PolyType.ptSubject, true)
  if (clip.length) engine.AddPaths(clip, PolyType.ptClip, true)
  engine.Execute(operation, tree, PolyFillType.pftNonZero, PolyFillType.pftNonZero)
  return tree
}

function contours(shapes, curveSegments) {
  const paths = []
  for (const shape of shapes) {
    const { shape: outer, holes } = shape.extractPoints(curveSegments)
    for (const [index, ring] of [outer, ...holes].entries()) {
      const path = ring.map(p => ({ X: Math.round(p.x * precision), Y: Math.round(p.y * precision) }))
      if (Clipper.Orientation(path) !== (index === 0)) path.reverse()
      paths.push(path)
    }
  }
  return Clipper.PolyTreeToPaths(booleanTree(paths))
}

function triangulate(tree, emit, curved = false) {
  for (let node = tree.GetFirst(); node; node = node.GetNext()) {
    if (node.IsHole()) continue
    const outer = node.Contour(), holes = node.Childs().map(child => child.Contour())
    if (curved) {
      // Ear clipping is fine for a flat cap, but its long triangle fans form
      // terraces when lifted onto a fillet. Constrained Delaunay connects
      // nearby samples across each band while retaining every boundary edge.
      const points = [], constraints = [], indices = new Map()
      for (const ring of [outer, ...holes]) {
        const ids = ring.map(p => {
          const id = key(p)
          if (!indices.has(id)) { indices.set(id, points.length); points.push(p) }
          return indices.get(id)
        })
        for (let i = 0; i < ids.length; i++) {
          const a = ids[i], b = ids[(i + 1) % ids.length]
          if (a !== b) constraints.push([a, b])
        }
      }
      for (const face of cdt2d(points.map(p => [p.X, p.Y]), constraints, { exterior: false })) emit(face.map(i => points[i]))
      continue
    }
    const all = outer.concat(...holes)
    const vector = p => new Vector2(p.X, p.Y)
    for (const face of ShapeUtils.triangulateShape(outer.map(vector), holes.map(ring => ring.map(vector)))) {
      emit(face.map(i => all[i]))
    }
  }
}

export function createDragonGeometry(shapes, { depth, chamfer, fillet }, { curveSegments = 28, bevelSegments = 16 } = {}) {
  const limits = profileLimits(depth, chamfer)
  const width = Math.max(0, Math.min(chamfer, limits.chamfer))
  const radius = Math.max(0, Math.min(fillet, limits.fillet))
  const original = contours(shapes, curveSegments)
  const directions = new Map(), segments = []
  for (const path of original) for (let i = 0; i < path.length; i++) {
    const p = path[i], previous = path[(i + path.length - 1) % path.length], next = path[(i + 1) % path.length]
    const before = Math.hypot(p.X - previous.X, p.Y - previous.Y), after = Math.hypot(next.X - p.X, next.Y - p.Y)
    const x = (p.Y - previous.Y) / before + (next.Y - p.Y) / after
    const y = (p.X - previous.X) / before + (next.X - p.X) / after
    const length = Math.hypot(x, y)
    directions.set(key(p), [x / length, y / length])
    segments.push([p, next])
  }
  const outward = p => {
    const id = key(p)
    if (directions.has(id)) return directions.get(id)
    let best = Infinity, direction
    for (const [a, b] of segments) {
      const dx = b.X - a.X, dy = b.Y - a.Y
      const t = Math.max(0, Math.min(1, ((p.X - a.X) * dx + (p.Y - a.Y) * dy) / (dx * dx + dy * dy)))
      const x = a.X + t * dx - p.X, y = p.Y - (a.Y + t * dy)
      const distance = x * x + y * y
      if (distance < best) { best = distance; direction = distance > 1e-12 ? [x, y] : [dy, dx] }
    }
    const length = Math.hypot(...direction)
    const result = direction.map(n => n / length)
    directions.set(id, result)
    return result
  }
  const offsetter = new ClipperOffset(4, precision * .0001)
  offsetter.AddPaths(original, JoinType.jtMiter, EndType.etClosedPolygon)
  const sections = []
  const count = width === 0 ? 0 : radius > 0 ? bevelSegments : 1
  for (let step = 0; step <= count; step++) {
    const [offset, drop] = count ? edgeProfile(step / count, width, radius) : [0, 0]
    const inset = width - offset
    let paths = original
    if (inset > 1e-8) {
      const candidate = []
      offsetter.Execute(candidate, -inset * precision)
      // Explicit intersection also protects the silhouette at acute corners.
      paths = Clipper.PolyTreeToPaths(booleanTree(candidate, original, ClipType.ctIntersection))
    }
    const t = count ? step / count : 0
    const angle = radius === 0 ? Math.PI / 4 : t <= .375 ? t / .375 * Math.PI / 4 : t >= .625 ? Math.PI / 2 - (1 - t) / .375 * Math.PI / 4 : Math.PI / 4
    sections.push({ paths, z: depth / 2 - drop, angle })
  }
  const positions = [], uvs = [], surfaceNormals = []
  const geometry = new BufferGeometry()
  const vertex = (p, z, uv, normal = [0, 0, 0]) => {
    positions.push(p.X / precision, -p.Y / precision, z)
    uvs.push(...(uv ?? [p.X / precision / 77, 1 - p.Y / precision / 77]))
    surfaceNormals.push(...normal)
  }
  const surface = (points, heights, angles = [0, 0, 0]) => {
    const [a, b, c] = points
    const area = (b.X - a.X) * (c.Y - a.Y) - (b.Y - a.Y) * (c.X - a.X)
    if (Math.abs(area) < 1) return
    const order = area > 0 ? [2, 1, 0] : [0, 1, 2]
    const normal = i => {
      const angle = angles[i]
      const [x, y] = angle ? outward(points[i]) : [0, 0]
      return [x * Math.sin(angle), y * Math.sin(angle), Math.cos(angle)]
    }
    for (const i of order) vertex(points[i], heights[i], undefined, normal(i))
    for (const i of [...order].reverse()) {
      const [x, y, z] = normal(i)
      vertex(points[i], -heights[i], undefined, [x, y, -z])
    }
  }
  const cap = sections[0]
  triangulate(booleanTree(cap.paths), triangle => surface(triangle, triangle.map(() => cap.z)))
  geometry.addGroup(0, positions.length / 3, 0)
  const edgeStart = positions.length / 3
  for (let i = 1; i < sections.length; i++) {
    const inner = sections[i - 1], outer = sections[i]
    const innerVertices = new Set(inner.paths.flat().map(key))
    const band = booleanTree(outer.paths, inner.paths, ClipType.ctDifference)
    triangulate(band, triangle => {
      const boundaries = triangle.map(p => innerVertices.has(key(p)) ? inner : outer)
      surface(triangle, boundaries.map(section => section.z), boundaries.map(section => section.angle))
    }, true)
  }
  const wallZ = sections.at(-1).z
  for (const path of original) {
    let distance = 0
    for (let i = 0; i < path.length; i++) {
      const a = path[i], b = path[(i + 1) % path.length]
      const next = distance + Math.hypot(b.X - a.X, b.Y - a.Y) / precision
      const length = Math.hypot(b.X - a.X, b.Y - a.Y)
      const face = [(b.Y - a.Y) / length, (b.X - a.X) / length]
      const wallNormal = p => {
        const smooth = directions.get(key(p))
        // Match the fillet at smooth contour vertices, while retaining hard
        // outline corners. No positional welding of neighboring fillet rings.
        const direction = smooth[0] * face[0] + smooth[1] * face[1] > Math.cos(Math.PI / 12) ? smooth : face
        return [...direction, 0]
      }
      const na = wallNormal(a), nb = wallNormal(b)
      // Outer and hole contours have opposite winding, orienting both walls.
      vertex(a, wallZ, [distance / 77, wallZ / 77], na)
      vertex(b, wallZ, [next / 77, wallZ / 77], nb)
      vertex(a, -wallZ, [distance / 77, -wallZ / 77], na)
      vertex(b, wallZ, [next / 77, wallZ / 77], nb)
      vertex(b, -wallZ, [next / 77, -wallZ / 77], nb)
      vertex(a, -wallZ, [distance / 77, -wallZ / 77], na)
      distance = next
    }
  }
  geometry.addGroup(edgeStart, positions.length / 3 - edgeStart, 1)
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('normal', new Float32BufferAttribute(surfaceNormals, 3))
  geometry.center()
  geometry.scale(2 / 77, 2 / 77, 2 / 77)
  return geometry
}
