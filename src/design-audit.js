/* Design-revisjon (D): overlay som skanner det RENDREDE designspråket på tvers
   av dokumentet — typografi (familie → størrelse/vekt/sporing/case), tekst-
   farger, bakgrunnsfarger, hjørneradier og skygger — med antall forekomster og
   eksempler. Verktøy for å luke inkonsistens: få kombinasjoner = stramt språk.
   Dev-verktøy på linje med FPS-måleren og S-inspektøren. */

const PANEL_ID = 'design-audit-panel'

function toHex(color) {
  const match = color.match(/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/)
  if (!match) return color
  const [, r, g, b, a] = match
  if (a !== undefined && Number(a) === 0) return null
  const hex = [r, g, b].map((c) => Number(c).toString(16).padStart(2, '0')).join('')
  return `#${hex}${a !== undefined && Number(a) < 1 ? ` / ${Number(a).toFixed(2)}` : ''}`
}

function familyName(fontFamily) {
  return fontFamily.split(',')[0].replace(/["']/g, '').trim()
}

function label(el) {
  const cls = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/)[0]}` : ''
  return `${el.tagName.toLowerCase()}${cls}`
}

function hasOwnText(el) {
  return [...el.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim().length > 1)
}

function bump(map, key, el, extra) {
  const entry = map.get(key) ?? { count: 0, sample: label(el), ...extra }
  entry.count += 1
  map.set(key, entry)
}

function collect() {
  const fonts = new Map() /* familie → Map(kombinasjon → {count, sample}) */
  const colors = new Map()
  const backgrounds = new Map()
  const radii = new Map()
  const shadows = new Map()

  document.querySelectorAll('body *').forEach((el) => {
    if (el.closest(`#${PANEL_ID}`)) return
    if (/^(SCRIPT|STYLE|LINK|META|BR|SOURCE)$/.test(el.tagName)) return
    const styles = getComputedStyle(el)
    if (styles.display === 'none' || styles.visibility === 'hidden') return

    if (hasOwnText(el)) {
      const family = familyName(styles.fontFamily)
      const combo = [
        `${parseFloat(styles.fontSize)}px`,
        styles.fontWeight,
        styles.letterSpacing === 'normal' ? '0' : styles.letterSpacing,
        styles.textTransform === 'none' ? '–' : styles.textTransform,
        styles.lineHeight === 'normal' ? 'lh:norm' : `lh:${parseFloat(styles.lineHeight)}px`,
      ].join(' · ')
      if (!fonts.has(family)) fonts.set(family, new Map())
      bump(fonts.get(family), combo, el, { size: parseFloat(styles.fontSize) })

      const hex = toHex(styles.color)
      if (hex) bump(colors, hex, el)
    }

    const bg = toHex(styles.backgroundColor)
    if (bg) bump(backgrounds, bg, el)

    const radius = styles.borderRadius
    if (radius && radius !== '0px') bump(radii, radius, el)

    if (styles.boxShadow && styles.boxShadow !== 'none') bump(shadows, styles.boxShadow, el)
  })

  return { fonts, colors, backgrounds, radii, shadows }
}

function sortedRows(map) {
  return [...map.entries()].sort((a, b) => b[1].count - a[1].count)
}

function esc(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;')
}

function swatchRows(map) {
  return sortedRows(map)
    .map(
      ([value, { count, sample }]) => `<div class="da-row">
        <span class="da-swatch" style="background:${value.split(' / ')[0]}"></span>
        <span class="da-value">${esc(value)}</span>
        <span class="da-sample">${esc(sample)}</span>
        <span class="da-count">×${count}</span>
      </div>`,
    )
    .join('')
}

function render(data) {
  const fontSections = [...data.fonts.entries()]
    .sort((a, b) => sortedRows(b[1]).reduce((sum, [, e]) => sum + e.count, 0) - sortedRows(a[1]).reduce((sum, [, e]) => sum + e.count, 0))
    .map(([family, combos]) => {
      const rows = [...combos.entries()]
        .sort((a, b) => b[1].size - a[1].size || b[1].count - a[1].count)
        .map(
          ([combo, { count, sample }]) => `<div class="da-row">
            <span class="da-value">${esc(combo)}</span>
            <span class="da-sample">${esc(sample)}</span>
            <span class="da-count">×${count}</span>
          </div>`,
        )
        .join('')
      return `<h3 class="da-family">${esc(family)} <span class="da-dim">(${combos.size} varianter)</span></h3>${rows}`
    })
    .join('')

  return `
    <div class="da-inner">
      <header class="da-header">
        <strong>DESIGN AUDIT</strong>
        <span class="da-dim">rendret språk på denne siden — D/Esc lukker</span>
      </header>
      <h2 class="da-section">Typografi</h2>
      ${fontSections}
      <h2 class="da-section">Tekstfarger <span class="da-dim">(${data.colors.size})</span></h2>
      ${swatchRows(data.colors)}
      <h2 class="da-section">Bakgrunner <span class="da-dim">(${data.backgrounds.size})</span></h2>
      ${swatchRows(data.backgrounds)}
      <h2 class="da-section">Hjørneradier <span class="da-dim">(${data.radii.size})</span></h2>
      ${sortedRows(data.radii)
        .map(([value, { count, sample }]) => `<div class="da-row"><span class="da-value">${esc(value)}</span><span class="da-sample">${esc(sample)}</span><span class="da-count">×${count}</span></div>`)
        .join('')}
      <h2 class="da-section">Skygger <span class="da-dim">(${data.shadows.size})</span></h2>
      ${sortedRows(data.shadows)
        .map(([value, { count, sample }]) => `<div class="da-row"><span class="da-value da-wrap">${esc(value)}</span><span class="da-sample">${esc(sample)}</span><span class="da-count">×${count}</span></div>`)
        .join('')}
    </div>`
}

export function initDesignAudit() {
  let panel = null

  const close = () => {
    panel?.remove()
    panel = null
  }

  const open = () => {
    close()
    panel = document.createElement('div')
    panel.id = PANEL_ID
    panel.innerHTML = render(collect())
    panel.addEventListener('click', (event) => {
      if (event.target === panel) close()
    })
    document.body.append(panel)
  }

  window.addEventListener(
    'keydown',
    (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? '')) return
      if (event.key === 'd' || event.key === 'D') {
        event.preventDefault()
        if (panel) close()
        else open()
      } else if (event.key === 'Escape' && panel) {
        /* Esc lukker revisjonen FØR case-sidens Esc-lukking får sjansen. */
        event.preventDefault()
        event.stopImmediatePropagation()
        close()
      }
    },
    true,
  )
}
