import { inject } from '@vercel/analytics'
import { initArchivedGrid } from './archived-grid.js'
import { initHeader } from './header.js'
import { initTimeline } from './timeline.js'

inject()

initHeader()
initTimeline()
initArchivedGrid()
