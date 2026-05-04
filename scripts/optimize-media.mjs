/**
 * Compress images (sharp) and video (ffmpeg-static) under public/images.
 * JPEG: mozjpeg, quality ~88, max width full 2560px / half 1600px.
 * Video: H.264 CRF 22, max width 1920, faststart; .mov → .mp4 (same base name).
 */
import sharp from 'sharp'
import ffmpegPath from 'ffmpeg-static'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const imagesDir = path.join(__dirname, '../public/images')

function runFfmpeg(args) {
  const r = spawnSync(ffmpegPath, args, { stdio: 'inherit' })
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${args.join(' ')}`)
}

async function optimizeJpeg(filePath, base) {
  const isHalf = base.includes('half')
  const maxWidth = isHalf ? 1600 : 2560
  const tmp = `${filePath}.tmp.jpg`
  await sharp(filePath)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(tmp)
  fs.renameSync(tmp, filePath)
  console.log('jpg', base)
}

function optimizeVideoMp4(filePath, base) {
  const tmp = `${filePath}.opt.tmp.mp4`
  runFfmpeg([
    '-y',
    '-i',
    filePath,
    '-map',
    '0:v:0',
    '-c:v',
    'libx264',
    '-crf',
    '22',
    '-preset',
    'medium',
    '-vf',
    "scale='min(1920,iw)':-2",
    '-movflags',
    '+faststart',
    '-pix_fmt',
    'yuv420p',
    '-an',
    tmp,
  ])
  fs.renameSync(tmp, filePath)
  console.log('mp4', base)
}

function movToMp4(filePath, base) {
  const outPath = filePath.replace(/\.mov$/i, '.mp4')
  const tmp = `${outPath}.tmp.mp4`
  runFfmpeg([
    '-y',
    '-i',
    filePath,
    '-map',
    '0:v:0',
    '-c:v',
    'libx264',
    '-crf',
    '22',
    '-preset',
    'medium',
    '-vf',
    "scale='min(1920,iw)':-2",
    '-movflags',
    '+faststart',
    '-pix_fmt',
    'yuv420p',
    '-an',
    tmp,
  ])
  fs.renameSync(tmp, outPath)
  fs.unlinkSync(filePath)
  console.log('mov→mp4', base, '→', path.basename(outPath))
}

async function main() {
  if (!ffmpegPath) {
    console.error('ffmpeg-static binary missing')
    process.exit(1)
  }
  const files = fs.readdirSync(imagesDir).filter((f) => !f.startsWith('.') && f !== '.DS_Store')
  const jpegs = files.filter((f) => /\.jpe?g$/i.test(f)).map((f) => path.join(imagesDir, f))
  const mp4s = files.filter((f) => /\.mp4$/i.test(f)).map((f) => path.join(imagesDir, f))
  const movs = files.filter((f) => /\.mov$/i.test(f)).map((f) => path.join(imagesDir, f))

  for (const filePath of jpegs) {
    await optimizeJpeg(filePath, path.basename(filePath))
  }
  for (const filePath of mp4s) {
    optimizeVideoMp4(filePath, path.basename(filePath))
  }
  for (const filePath of movs) {
    movToMp4(filePath, path.basename(filePath))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
