import { CubeUVReflectionMapping, DataTexture, DataUtils, HalfFloatType, LinearSRGBColorSpace, RGBAFormat, BufferAttribute, BufferGeometry, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, TextureLoader } from 'three'
import geometryUrl from './assets/footer-dragon/geometry.bin.gz?url'
import environmentUrl from './assets/footer-dragon/environment.bin.gz?url'
import finishUrl from './assets/footer-dragon/finish.webp'
import manifest from './assets/footer-dragon/geometry.json'

async function unpack(url, expectedBytes) {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Dragon asset unavailable')
  // Some hosts mark .gz assets with Content-Encoding (fetch decodes them),
  // while others serve the compressed bytes unchanged. Accept both.
  let data = await response.arrayBuffer()
  if (data.byteLength !== expectedBytes) {
    data = await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
  }
  if (data.byteLength !== expectedBytes) throw new Error('Incomplete dragon asset')
  return data
}

export async function loadFooterGeometry() {
  const data = await unpack(geometryUrl, manifest.geometryBytes)
  const geometry = new BufferGeometry()
  const types = { Float32Array, Int16Array, Uint16Array, Uint32Array }
  for (const [name, { offset, length, itemSize, type, normalized }] of Object.entries(manifest.attributes)) {
    const attribute = new BufferAttribute(new types[type](data, offset, length), itemSize, normalized)
    if (name === 'index') geometry.setIndex(attribute)
    else geometry.setAttribute(name, attribute)
  }
  for (const group of manifest.groups) geometry.addGroup(group.start, group.count, group.materialIndex)
  return geometry
}
export async function loadFooterFinish() {
  const texture = await new TextureLoader().loadAsync(finishUrl)
  texture.flipY = false
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.magFilter = LinearFilter
  texture.minFilter = LinearMipmapLinearFilter
  texture.generateMipmaps = true
  return texture
}

export async function loadFooterEnvironment() {
  const { width, height } = manifest.environment
  const rgbe = new Uint8Array(await unpack(environmentUrl, width * height * 4))
  const pixels = new Uint16Array(rgbe.length)
  for (let i = 0; i < rgbe.length; i += 4) {
    const scale = 2 ** (rgbe[i + 3] - 128) / 255
    for (let channel = 0; channel < 3; channel++) pixels[i + channel] = DataUtils.toHalfFloat(rgbe[i + channel] * scale)
    pixels[i + 3] = DataUtils.toHalfFloat(1)
  }
  const texture = new DataTexture(pixels, width, height, RGBAFormat, HalfFloatType)
  texture.mapping = CubeUVReflectionMapping
  texture.colorSpace = LinearSRGBColorSpace
  texture.minFilter = texture.magFilter = LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}
