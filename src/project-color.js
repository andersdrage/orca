// Shared by the thumbnail sampler and the build-time fallback generator.
export function lightThumbnailColor(pixels, channels = 4) {
  const buckets = Array.from({ length: 24 }, () => ({ weight: 0, r: 0, g: 0, b: 0 }))
  for (let i = 0; i < pixels.length; i += channels) {
    if (channels === 4 && pixels[i + 3] < 128) continue
    const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]].map(value => value / 255)
    const high = Math.max(r, g, b), low = Math.min(r, g, b), delta = high - low
    if (delta < .055 || high < .1 || low > .94) continue
    let hue = high === r ? ((g - b) / delta + 6) % 6 : high === g ? (b - r) / delta + 2 : (r - g) / delta + 4
    const bucket = buckets[Math.round(hue * 4) % 24]
    const weight = Math.sqrt(delta / high)
    bucket.weight += weight
    bucket.r += r * weight
    bucket.g += g * weight
    bucket.b += b * weight
  }
  const dominant = buckets.reduce((best, bucket) => bucket.weight > best.weight ? bucket : best)
  if (!dominant.weight) return '#f4f4f3'
  const rgb = [dominant.r, dominant.g, dominant.b].map(value => value / dominant.weight)
  // Mix eight percent of the selected color into the existing off-white.
  const tint = rgb.map(value => Math.round(250 * .92 + value * 255 * .08))
  return `#${tint.map(value => value.toString(16).padStart(2, '0')).join('')}`
}
