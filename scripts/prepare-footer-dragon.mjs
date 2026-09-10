import { createServer } from 'vite'
import { chromium } from 'playwright'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import sharp from 'sharp'
import { DataUtils, Shape } from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { createDragonGeometry } from '../src/dragon-geometry.js'
import { createFinishTexture } from '../src/dragon-finish.js'
import { footerDragonSettings, footerDragonDetail } from '../src/footer-dragon-settings.js'

const server = await createServer({ logLevel: 'error', server: { host: '127.0.0.1', port: 0, open: false } })
await server.listen()
const browser = await chromium.launch()
let shapes, environment
try {
  const page = await browser.newPage()
  // Use the browser's native SVG parser; do all expensive geometry work offline.
  await page.goto(server.resolvedUrls.local[0] + 'images/dragonmark.svg')
  const json = await page.evaluate(async () => {
    const { SVGLoader } = await import('/node_modules/three/examples/jsm/loaders/SVGLoader.js')
    return new SVGLoader().parse(document.documentElement.outerHTML).paths.flatMap(path => SVGLoader.createShapes(path)).map(shape => shape.toJSON())
  })
  shapes = json.map(json => new Shape().fromJSON(json))
  environment = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js')
    const { createStudioEnvironment } = await import('/src/dragon-studio.js')
    const { footerDragonSettings } = await import('/src/footer-dragon-settings.js')
    const renderer = new THREE.WebGLRenderer()
    const target = createStudioEnvironment(renderer, footerDragonSettings, 128)
    const pixels = new Uint16Array(target.width * target.height * 4)
    renderer.readRenderTargetPixels(target, 0, 0, target.width, target.height, pixels)
    if (!pixels.some(value => value > 0)) throw new Error('Environment readback failed')
    const bytes = new Uint8Array(pixels.buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
    const result = { width: target.width, height: target.height, base64: btoa(binary) }
    target.dispose(); renderer.dispose()
    return result
  })
} finally { await browser.close(); await server.close() }
const geometry = mergeVertices(createDragonGeometry(shapes, footerDragonSettings, footerDragonDetail), 1e-6)
const attributes = {}, chunks = []
let offset = 0
for (const [name, attribute] of Object.entries({ ...geometry.attributes, index: geometry.index })) {
  const normalized = name === 'position' || name === 'normal'
  if (normalized && attribute.array.some(value => Math.abs(value) > 1)) throw new Error(`${name} exceeds quantization range`)
  const array = normalized ? Int16Array.from(attribute.array, value => Math.round(value * 32767)) : attribute.array
  const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength)
  attributes[name] = { offset, length: array.length, itemSize: attribute.itemSize, type: array.constructor.name, normalized }
  chunks.push(bytes); offset += bytes.length
  const padding = (4 - offset % 4) % 4
  if (padding) { chunks.push(Buffer.alloc(padding)); offset += padding }
}
const dir = new URL('../src/assets/footer-dragon/', import.meta.url)
await mkdir(dir, { recursive: true })
const packed = gzipSync(Buffer.concat(chunks), { level: 9, mtime: 0 })
await writeFile(new URL('geometry.bin.gz', dir), packed)
const texture = createFinishTexture({ capabilities: { getMaxAnisotropy: () => 8 } })
await sharp(texture.image.data, { raw: { width: 2048, height: 2048, channels: 4 } }).resize(512, 512).webp({ lossless: true, effort: 6 }).toFile(new URL('finish.webp', dir).pathname)
const halfBytes = Buffer.from(environment.base64, 'base64')
const half = new Uint16Array(halfBytes.buffer, halfBytes.byteOffset, halfBytes.length / 2)
const rgbe = new Uint8Array(half.length)
for (let i = 0; i < half.length; i += 4) {
  const rgb = [0, 1, 2].map(channel => DataUtils.fromHalfFloat(half[i + channel]))
  const maximum = Math.max(...rgb)
  if (maximum < 1e-10) continue
  const exponent = Math.ceil(Math.log2(maximum))
  const scale = 255 / 2 ** exponent
  for (let channel = 0; channel < 3; channel++) rgbe[i + channel] = Math.round(rgb[channel] * scale)
  rgbe[i + 3] = exponent + 128
}
const environmentBytes = gzipSync(rgbe, { level: 9, mtime: 0 })
await writeFile(new URL('environment.bin.gz', dir), environmentBytes)
const inputs = ['scripts/prepare-footer-dragon.mjs', 'src/dragon-studio.js', 'public/images/dragonmark.svg', 'src/dragon-geometry.js', 'src/dragon-finish.js', 'src/footer-dragon-settings.js']
const hashes = Object.fromEntries(await Promise.all(inputs.map(async path => [path, createHash('sha256').update(await readFile(path)).digest('hex')])))
const manifest = { environment: { encoding: 'rgbe', width: environment.width, height: environment.height, transferBytes: environmentBytes.length }, attributes, groups: geometry.groups, vertices: geometry.attributes.position.count, triangles: geometry.index.count / 3, geometryBytes: offset, transferBytes: packed.length, hashes }
await writeFile(new URL('geometry.json', dir), JSON.stringify(manifest, null, 2) + '\n')
console.log(JSON.stringify({ vertices: manifest.vertices, triangles: manifest.triangles, geometryBytes: offset, transferBytes: packed.length }, null, 2))
texture.dispose(); geometry.dispose()
