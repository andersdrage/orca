import { readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import sharp from 'sharp'

// Derived at build/dev time, so optimized files remain the source of truth.
export function mediaDimensions() {
  const id = 'virtual:media-dimensions'
  let root
  return {
    name: 'media-dimensions',
    configResolved(config) { root = join(config.root, 'public/images') },
    resolveId(source) { if (source === id) return '\0' + id },
    async load(source) {
      if (source !== '\0' + id) return
      const dimensions = {}
      const scan = async (dir) => {
        for (const entry of await readdir(dir, { withFileTypes: true })) {
          const path = join(dir, entry.name)
          if (entry.isDirectory()) await scan(path)
          else if (/\.(jpe?g|png|webp|avif|gif|svg)$/i.test(entry.name)) {
            this.addWatchFile(path)
            const { width, height } = await sharp(path).metadata()
            if (width && height) dimensions[relative(root, path)] = [width, height]
          }
        }
      }
      await scan(root)
      return `export default ${JSON.stringify(dimensions)}`
    },
  }
}
