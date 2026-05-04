import './style.css'
import { buildPortfolioHtml } from './portfolio-render.js'

const root = document.querySelector('[data-portfolio-root]')
if (root) {
  root.innerHTML = buildPortfolioHtml()
}
