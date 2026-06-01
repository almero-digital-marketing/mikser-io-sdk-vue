// Build-time script — fetches the route manifest from mikser and
// serializes it to src/generated/routes.json. The vite-ssg config
// reads this file to know which routes to pre-render. The public
// runtime router (src/public/router.js) reads it to install routes
// without calling client.list() at boot.
//
// Run before `vite build`. See package.json scripts.
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createClient } from 'mikser-io-sdk-api'
import { generateMikserRoutes } from 'mikser-io-sdk-vue'

const here = dirname(fileURLToPath(import.meta.url))

// Build-time uses the sitemap endpoint — narrow query (meta.component
// only), small payload. Lines up with the runtime editor's sitemap
// client + the proxy's cached-file failover path.
const sitemap = createClient({ baseUrl: process.env.MIKSER_URL ?? 'http://localhost:3001' })
    .entities('sitemap')

// Use the SAME mapRoute as the runtime router — one source of truth.
// We strip the component function before serializing (functions don't
// JSON-encode); the runtime rehydrates by looking up the component in
// the views table.
const { mapRoute } = await import(resolve(here, '../src/route-mapping.js'))

const routes = (await generateMikserRoutes({ client: sitemap, mapRoute })).filter(Boolean)

const serializable = routes.map(r => ({
    path:      r.path,
    name:      r.name,
    component: r.meta?.component,
    title:     r.meta?.title,
    props:     r.props ? r.props({ params: {} }) : undefined,
}))

const outDir  = resolve(here, '../src/generated')
const outFile = resolve(outDir, 'routes.json')
await mkdir(outDir, { recursive: true })
await writeFile(outFile, JSON.stringify(serializable, null, 2))

console.log(`✓ wrote ${serializable.length} routes → ${outFile}`)
