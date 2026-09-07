import { resolve, dirname, sep } from 'node:path'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Vercel serves the built 404.html automatically. Match that behavior locally
// after Vite has tried real files, without rewriting missing assets to HTML.
function notFoundPage() {
  const install = (server, built) => () => {
    server.middlewares.use(async (request, response, next) => {
      if (!['GET', 'HEAD'].includes(request.method) || !request.headers.accept?.includes('text/html')) return next()
      try {
        const root = built ? resolve(server.config.root, server.config.build.outDir) : server.config.root
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
        const candidate = resolve(root, `.${pathname}`)
        if (candidate.startsWith(root + sep) && existsSync(candidate)) return next()
        let html = await readFile(resolve(root, '404.html'), 'utf8')
        if (!built) html = await server.transformIndexHtml('/404.html', html)
        response.writeHead(404, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
        response.end(request.method === 'HEAD' ? undefined : html)
      } catch (error) {
        next(error)
      }
    })
  }
  return {
    name: 'local-not-found-page',
    configureServer: (server) => install(server, false),
    configurePreviewServer: (server) => install(server, true),
  }
}

export default defineConfig({
  appType: 'mpa',
  plugins: [tailwindcss(), notFoundPage()],
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
        notFound: resolve(__dirname, '404.html'),
        about: resolve(__dirname, 'about/index.html'),
        praise: resolve(__dirname, 'praise/index.html'),
        history: resolve(__dirname, 'history/index.html'),
        people: resolve(__dirname, 'people/index.html'),
        micromilspec: resolve(__dirname, 'micromilspec/index.html'),
        hjemla: resolve(__dirname, 'hjemla/index.html'),
        hmkg: resolve(__dirname, 'hmkg/index.html'),
        finn: resolve(__dirname, 'finn/index.html'),
        nettavisen: resolve(__dirname, 'nettavisen/index.html'),
        uber: resolve(__dirname, 'uber/index.html'),
        boligmappa: resolve(__dirname, 'boligmappa/index.html'),
        archivedWork: resolve(__dirname, 'archived-work/index.html'),
        brathwait: resolve(__dirname, 'brathwait/index.html'),
        hummingPeople: resolve(__dirname, 'humming-people/index.html'),
        mountainMilk: resolve(__dirname, 'mountain-milk/index.html'),
        offMarket: resolve(__dirname, 'off-market/index.html'),
        logo: resolve(__dirname, 'logo/index.html'),
      },
    },
  },
})
