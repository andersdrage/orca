import dimensions from 'virtual:media-dimensions'

function sizeFor(file) {
  const image = file.replace(/^\/images\//, '').replace(/\.(mp4|webm|mov)$/i, '-poster.jpg')
  const size = dimensions[image]
  if (!size) throw new Error(`Missing media dimensions: ${file}`)
  return size
}

export function mediaRatio(file) {
  const [width, height] = sizeFor(file)
  return width / height
}

export function mediaSize(file) {
  const size = sizeFor(file)
  // Explicit ratio also reserves space in WebKit while a deferred image has
  // no decoded source (its automatic replaced-element ratio can use alt text).
  return `width="${size[0]}" height="${size[1]}" style="aspect-ratio: ${size[0]} / ${size[1]}"`
}
