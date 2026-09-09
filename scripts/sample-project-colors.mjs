import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'
import { lightThumbnailColor } from '../src/project-color.js'
const names = { houeland: 'houeland', micromilspec: 'micro', hjemla: 'hjemla', 'off-market': 'offmarket', boligmappa: 'boligmappa', finn: 'finn', nettavisen: 'nettavisen', uber: 'uber' }
const colors = {}
for (const [id, name] of Object.entries(names)) {
  const { data, info } = await sharp(`public/images/new-covers/cover-ratio-${name}.webp`).resize(64, 64, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  colors[id] = lightThumbnailColor(data, info.channels)
}
await writeFile('src/project-colors.js', `// Generated from the default project thumbnails by scripts/sample-project-colors.mjs.\nexport const projectColors = ${JSON.stringify(colors, null, 2)}\n`)
console.log(colors)
