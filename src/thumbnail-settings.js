import { sessionState } from './session-state.js'

export const THUMBNAIL_SETTING = 'debug:same-size-thumbnails'
export const THUMBNAIL_CHANGE = 'thumbnails:change'
export const sameSizeThumbnails = () => sessionState.getItem(THUMBNAIL_SETTING) !== '0'

const covers = {
  "houeland": "andersdrage-houeland-cover.webp",
  "micromilspec": "andersdrage-micromilspec-cover.webp",
  "hjemla": "andersdrage-hjemla-cover.webp",
  "off-market": "andersdrage-off-market-cover.webp",
  "boligmappa": "andersdrage-boligmappa-cover.webp",
  "finn": "andersdrage-finn-cover.webp",
  "nettavisen": "andersdrage-nettavisen-cover.webp",
  "uber": "andersdrage-uber-cover.webp"
}

export function thumbnailAppearance(tile) {
  if (!sameSizeThumbnails() || (!covers[tile.id] && !tile.archive)) return { ...tile, h: `calc(${tile.h} * 1.3)` }
  return { ...tile, ...(covers[tile.id] ? { image: `/images/${covers[tile.id]}` } : {}),
    ratio: '13 / 10', h: 'calc(min(43svh, calc((100vw - 48px) / 1.3)) * 1.3)' }
}
