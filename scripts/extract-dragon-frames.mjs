// Keep the full-resolution PNG source frames locally; ship a small transparent
// ink version of the same rotation for the light footer.
import { mkdir, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import ffmpeg from 'ffmpeg-static'
import sharp from 'sharp'

const source = 'public/images/drage-black-bg-preview-001.mp4'
const originals = 'originals/dragon-scroll-2026-09-09'
const output = 'public/images/dragon-scroll'
await mkdir(originals, { recursive: true })
await mkdir(output, { recursive: true })
const result = spawnSync(ffmpeg, ['-n', '-i', source, '-vf', 'fps=12', '-start_number', '0', `${originals}/frame-%03d.png`], { encoding: 'utf8' })
if (result.status !== 0) throw new Error(result.stderr)
for (let index = 0; index < 120; index++) {
  const name = `frame-${String(index).padStart(3, '0')}.png`
  const { data, info } = await sharp(`${originals}/${name}`).resize(320, 320).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const rgba = Buffer.alloc(info.width * info.height * 4)
  for (let p = 0; p < info.width * info.height; p++) {
    // Treat the black matte as transparency and the silver highlights as ink.
    // This retains every reflection and antialiased edge without a black box.
    rgba[p * 4] = 24
    rgba[p * 4 + 1] = 24
    rgba[p * 4 + 2] = 27
    rgba[p * 4 + 3] = Math.max(data[p * 3], data[p * 3 + 1], data[p * 3 + 2])
  }
  await sharp(rgba, { raw: { width: 320, height: 320, channels: 4 } }).png({ compressionLevel: 9, palette: true }).toFile(`${output}/${name}`)
}
await writeFile(`${originals}/README.md`, '120 full-resolution PNG frames at 12 fps from the existing 10-second dragon video. Browser copies in public/images/dragon-scroll use a transparent charcoal treatment for light backgrounds. Original video is unchanged.\n')
console.log('Extracted 120 source PNGs and 120 transparent browser PNGs.')
