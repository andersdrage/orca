import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [tailwindcss()],
  /* Dev: forhåndskompiler alle entry-moduler ved serverstart — første klikk på
     en case skal ikke vente på Vite-transform (det er det som får view
     transition-en til å times ut og hoppe over animasjonen lokalt). */
  server: {
    warmup: {
      clientFiles: ['./src/main.js', './src/case.js', './src/about.js', './src/praise.js'],
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about/index.html'),
        praise: resolve(__dirname, 'praise/index.html'),
        micromilspec: resolve(__dirname, 'micromilspec/index.html'),
        hjemla: resolve(__dirname, 'hjemla/index.html'),
        offMarket: resolve(__dirname, 'off-market/index.html'),
        misc: resolve(__dirname, 'misc/index.html'),
      },
    },
  },
})
