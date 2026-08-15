import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [tailwindcss()],
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
