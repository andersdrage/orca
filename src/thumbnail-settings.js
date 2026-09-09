import { sessionState } from './session-state.js'

export const THUMBNAIL_SETTING = 'debug:same-size-thumbnails'
export const THUMBNAIL_CHANGE = 'thumbnails:change'
export const sameSizeThumbnails = () => sessionState.getItem(THUMBNAIL_SETTING) === '1'

const covers = {
  houeland: 'houeland',
  micromilspec: 'micro',
  hjemla: 'hjemla',
  'off-market': 'offmarket',
  boligmappa: 'boligmappa',
  finn: 'finn',
  nettavisen: 'nettavisen',
  uber: 'uber',
}

export function thumbnailAppearance(tile) {
  if (!sameSizeThumbnails() || !covers[tile.id]) return tile
  return { ...tile, image: `/images/new-covers/cover-ratio-${covers[tile.id]}.webp`,
    ratio: '13 / 10', h: 'min(43svh, calc((100vw - 48px) / 1.3))' }
}
