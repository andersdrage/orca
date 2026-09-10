import * as THREE from 'three'
import { studioDefaults } from './dragon-studio.js'

export const defaults = { ...studioDefaults, roughness: .36, anisotropy: .75, grain: .42, scratches: .24, direction: 0, edge: .23, depth: 3.2, chamfer: .55, fillet: .18, pattern: 'sunburst', centerX: 61, centerY: 39 }
export const presets = {
  titanium: { ...defaults, color: '#aaa9a6' },
  silver: { ...defaults, color: '#cecfcb', roughness: .25, anisotropy: .65, grain: .16, scratches: .08, edge: .16 },
  worn: { ...defaults, color: '#99958b', roughness: .43, grain: .52, scratches: .8, edge: .25 },
}

// One seeded, mipmapped surface map: R is long directional micrograin;
// G is a much sparser, irregular scratch layer. No downloaded texture assets.
export function createFinishTexture(renderer) {
  let seed = 1739
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
  const resolution = 2048
  const pixels = new Uint8Array(resolution * resolution * 4)
  const fine = Float32Array.from({ length: 1024 }, random)
  const coarse = Float32Array.from({ length: 128 }, random)
  const smoothNoise = (values, position) => {
    const i = Math.floor(position), fraction = position - i
    const blend = fraction * fraction * (3 - 2 * fraction)
    return THREE.MathUtils.lerp(values[i % values.length], values[(i + 1) % values.length], blend)
  }
  for (let y = 0; y < resolution; y++) {
    // Several groove widths survive minification; slower variation groups
    // them into machining passes instead of uniform, full-length hairlines.
    const line = 38 + smoothNoise(fine, y / 2) * 122 + smoothNoise(coarse, y / 16) * 54
    const phase = random() * Math.PI * 2
    for (let x = 0; x < resolution; x++) {
      const i = (y * resolution + x) * 4
      const envelope = .66 + .34 * Math.sin(x * Math.PI * 4 / resolution + phase)
      pixels[i] = THREE.MathUtils.clamp(128 + (line - 128) * envelope + (random() - .5) * 18, 0, 255)
      pixels[i + 1] = 0; pixels[i + 2] = 0; pixels[i + 3] = 255
    }
  }
  for (let line = 0; line < 230; line++) {
    const x = random() * resolution, y = random() * resolution
    const length = 30 + random() ** 2 * 480
    const slope = (random() - .5) * .15
    for (let step = 0; step < length; step++) {
      const xx = Math.floor(x + step) % resolution
      const yy = (Math.floor(y + step * slope + Math.sin(step * .02) * .35) + resolution) % resolution
      const fade = Math.sin(Math.PI * step / length)
      pixels[(yy * resolution + xx) * 4 + 1] = Math.floor((100 + random() * 155) * fade)
    }
  }
  const texture = new THREE.DataTexture(pixels, resolution, resolution)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  texture.needsUpdate = true
  return texture
}


export function createDragonFinish(renderer, state, texture) {
const uniforms = {
  uFinish: { value: null }, uGrain: { value: state.grain }, uScratches: { value: state.scratches },
  uDirection: { value: 0 }, uSunburst: { value: 0 }, uBrushCenter: { value: new THREE.Vector2(.5, 1 - 28.5 / 77) },
}
const materials = []

function metal(edge = false) {
  const material = new THREE.MeshPhysicalMaterial({
    color: state.color, metalness: 1, roughness: edge ? state.edge : state.roughness,
    anisotropy: edge ? .3 : state.anisotropy,
  })
  // Keep the anisotropy shader compiled even at the zero setting. UV tangents
  // come from the planar front mapping and perimeter mapping on the bevels.
  material.defines = { USE_UV: '', USE_ANISOTROPY: '' }
  // Three.js skips uploading this vector at exactly zero. Own the uniform
  // so turning anisotropy off also clears its previous direction/strength.
  const anisotropyVector = { value: new THREE.Vector2() }
  material.userData.anisotropyVector = anisotropyVector.value
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms, { uEdge: { value: edge ? .3 : 1 }, anisotropyVector })
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      uniform sampler2D uFinish;
      uniform float uGrain, uScratches, uDirection, uEdge, uSunburst;
      uniform vec2 uBrushCenter;
      vec2 finishUV(vec2 p) {
        if (uSunburst > 0.5 && uEdge > 0.5) {
          vec2 radial = p - uBrushCenter;
          if (dot(radial, radial) < 1e-12) radial = vec2(1e-6, 0.0);
          return vec2(length(radial), atan(radial.y, radial.x) / (2.0 * PI) + uDirection / (2.0 * PI));
        }
        float c = cos(uDirection), s = sin(uDirection);
        return mat2(c, -s, s, c) * (p - 0.5) + 0.5;
      }
      vec2 finishLayersAt(vec2 p) {
        vec2 mapped = finishUV(p);
        vec2 dx = dFdx(mapped), dy = dFdy(mapped);
        if (uSunburst > 0.5 && uEdge > 0.5) {
          // Unwrap the polar seam before selecting texture mip levels.
          dx.y -= floor(dx.y + 0.5); dy.y -= floor(dy.y + 0.5);
        }
        return textureGrad(uFinish, mapped, dx, dy).rg;
      }
      float finishHeight(vec2 p) {
        vec2 layers = finishLayersAt(p);
        float centerFade = uSunburst > 0.5 && uEdge > 0.5 ? smoothstep(0.0, 0.015, length(p - uBrushCenter)) : 1.0;
        return (layers.r * uGrain * 0.65 - layers.g * uScratches * 0.85) * centerFade;
      }
    `).replace('#include <roughnessmap_fragment>', `
      #include <roughnessmap_fragment>
      vec2 finishPoint = vUv;
      vec2 finishLayers = finishLayersAt(finishPoint);
      roughnessFactor = clamp(roughnessFactor + uEdge * (
        (finishLayers.r - 0.5) * uGrain * 0.25 + finishLayers.g * uScratches * 0.22
      ), 0.08, 0.9);
    `).replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      float texel = 1.0 / 2048.0;
      vec2 slope = vec2(
        finishHeight(finishPoint + vec2(texel, 0.0)) - finishHeight(finishPoint - vec2(texel, 0.0)),
        finishHeight(finishPoint + vec2(0.0, texel)) - finishHeight(finishPoint - vec2(0.0, texel))
      );
      normal = normalize(normal - (tbn[0] * slope.x + tbn[1] * slope.y) * uEdge);
    `).replace('#include <lights_physical_fragment>', THREE.ShaderChunk.lights_physical_fragment.replace(
      'vec2 anisotropyV = anisotropyVector;',
      `vec2 anisotropyV = anisotropyVector;
       if (uSunburst > 0.5 && uEdge > 0.5) {
         vec2 radial = vUv - uBrushCenter;
         float radius = length(radial);
         anisotropyV = vec2(-radial.y, radial.x) / max(radius, 1e-5) * length(anisotropyVector) * smoothstep(0.0, 0.01, radius);
       }`,
    ))
  }
  material.customProgramCacheKey = () => `dragon-finish-v2-${edge}`
  materials.push(material)
  return material
}

  uniforms.uFinish.value = texture ?? createFinishTexture(renderer)
  metal(); metal(true)
  function update() {
  uniforms.uGrain.value = state.grain; uniforms.uScratches.value = state.scratches
  uniforms.uDirection.value = THREE.MathUtils.degToRad(state.direction)
  uniforms.uSunburst.value = state.pattern === 'sunburst' ? 1 : 0
  uniforms.uBrushCenter.value.set(state.centerX / 100, 1 - (1 - state.centerY / 100) * 57 / 77)
  materials.forEach((mat, i) => {
    mat.color.set(state.color); mat.roughness = i === 0 ? state.roughness : state.edge
    mat.anisotropy = i === 0 ? state.anisotropy : state.anisotropy * .4
    // Groove normals vary across the brushing, so the broad reflection axis
    // is perpendicular to the visible scratches.
    mat.anisotropyRotation = uniforms.uDirection.value + Math.PI / 2
    mat.userData.anisotropyVector.set(mat.anisotropy * Math.cos(mat.anisotropyRotation), mat.anisotropy * Math.sin(mat.anisotropyRotation))
  })
  }
  update()
  return { materials, update, dispose() { uniforms.uFinish.value.dispose(); materials.forEach(material => material.dispose()) } }
}
