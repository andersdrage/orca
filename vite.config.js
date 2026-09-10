import { resolve, dirname, sep } from 'node:path'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import deployment from './vercel.json'
import { mediaDimensions } from './scripts/media-dimensions.mjs'

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
        const redirect = deployment.redirects?.find(rule => rule.source.replace(/\/$/, '') === pathname.replace(/\/$/, ''))
        if (redirect) {
          const search = new URL(request.url, 'http://localhost').search
          response.writeHead(redirect.permanent ? 308 : 307, { location: redirect.destination + search })
          return response.end()
        }
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
  plugins: [tailwindcss(), notFoundPage(), mediaDimensions(), {
    name: 'transition-render-readiness',
    // Vite rebuilds module script tags; preserve render blocking in the output.
    // The timeline/hero must exist before pagereveal takes its first snapshot.
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (!html.includes('data-case-root') && !html.includes('data-timeline')) return html
        return html.replace(/<script\b(?=[^>]*type="module")([^>]*)>/g, (tag, attrs) =>
          attrs.includes('blocking=') ? tag : `<script blocking="render"${attrs}>`)
      },
    },
  }],
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
        timeline: resolve(__dirname, 'timeline/index.html'),
        historyRedirect: resolve(__dirname, 'history/index.html'),
        people: resolve(__dirname, 'people/index.html'),
        micromilspec: resolve(__dirname, 'micromilspec/index.html'),
        houeland: resolve(__dirname, 'houeland/index.html'),
        hjemla: resolve(__dirname, 'hjemla/index.html'),
        finn: resolve(__dirname, 'finn/index.html'),
        nettavisen: resolve(__dirname, 'nettavisen/index.html'),
        uber: resolve(__dirname, 'uber/index.html'),
        boligmappa: resolve(__dirname, 'boligmappa/index.html'),
        archivedWork: resolve(__dirname, 'archived-work/index.html'),
        offMarket: resolve(__dirname, 'off-market/index.html'),
        logo: resolve(__dirname, 'logo/index.html'),
        sharingImage: resolve(__dirname, 'sharing-image/index.html'),
      },
    },
  },
})
