import { presets } from './dragon-finish.js'

// Rebuild the prepared footer assets after changing the SVG or geometry values:
// npm run prepare-footer-dragon
export const footerDragonSettings = {
  ...presets.titanium,
  depth: 8.6, chamfer: .85, fillet: .34,
  roughness: .4, anisotropy: .27, grain: .77,
  light: 1.41, key: .56, fill: .38,
}
export const footerDragonDetail = { curveSegments: 12, bevelSegments: 8 }
