// Swap static assets: Safari does not reliably apply dark-mode CSS inside SVG favicons.
const icon = document.querySelector('link[rel="icon"]')
const darkMode = window.matchMedia('(prefers-color-scheme: dark)')

function updateFavicon() {
  if (!icon) return
  icon.href = `/images/favicon-dragon-${darkMode.matches ? 'dark' : 'light'}.svg`
}

updateFavicon()
darkMode.addEventListener('change', updateFavicon)
