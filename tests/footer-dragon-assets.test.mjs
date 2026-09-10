import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import sharp from 'sharp'
const root = new URL('../', import.meta.url)
const manifest = JSON.parse(await readFile(new URL('src/assets/footer-dragon/geometry.json', root)))
test('prepared footer assets match their source inputs', async () => {
  for (const [path, hash] of Object.entries(manifest.hashes)) {
    assert.equal(createHash('sha256').update(await readFile(new URL(path, root))).digest('hex'), hash, `Run npm run prepare-footer-dragon after changing ${path}`)
  }
})
test('prepared mesh stays within footer budgets and has valid indices and normals', async () => {
  assert.ok(manifest.triangles < 20000)
  assert.ok(manifest.geometryBytes < 350000)
  const bytes = gunzipSync(await readFile(new URL('src/assets/footer-dragon/geometry.bin.gz', root)))
  assert.equal(bytes.length, manifest.geometryBytes)
  const types = { Float32Array, Int16Array, Uint16Array, Uint32Array }
  for (const [name, a] of Object.entries(manifest.attributes)) {
    const values = new types[a.type](bytes.buffer, bytes.byteOffset + a.offset, a.length)
    assert.ok(values.every(Number.isFinite))
    if (name === 'index') assert.ok(values.every(value => value < manifest.vertices))
    if (name === 'normal') for (let i = 0; i < values.length; i += 3) {
      assert.ok(Math.abs(Math.hypot(values[i], values[i + 1], values[i + 2]) / 32767 - 1) < .0001)
    }
  }
  assert.equal(manifest.groups.reduce((sum, group) => sum + group.count, 0), manifest.triangles * 3)
  const texture = await sharp(new URL('src/assets/footer-dragon/finish.webp', root).pathname).metadata()
  assert.equal(texture.width, 512); assert.equal(texture.height, 512)
})
test('prepared reflection lighting contains finite HDR values within its size budget', async () => {
  const packed = await readFile(new URL('src/assets/footer-dragon/environment.bin.gz', root))
  assert.ok(packed.length < 120000)
  const bytes = gunzipSync(packed)
  assert.equal(bytes.length, manifest.environment.width * manifest.environment.height * 4)
  let maximum = 0
  for (let i = 0; i < bytes.length; i += 4) for (let channel = 0; channel < 3; channel++) {
    const value = bytes[i + channel] * 2 ** (bytes[i + 3] - 128) / 255
    assert.ok(Number.isFinite(value) && value >= 0 && value < 100)
    maximum = Math.max(maximum, value)
  }
  assert.ok(maximum > 1, 'lighting retains highlights above display white')
})
