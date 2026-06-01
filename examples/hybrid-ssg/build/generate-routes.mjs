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

// Build-time uses the same single client as the runtime editor.
// data.catalog points at the static snapshot the data plugin writes
// (out/data/sitemap.json) — generateMikserRoutes consults it before
// falling back to a fresh list() call, so the build doesn't drag full
// markdown bodies through just to enumerate routes.
const client = createClient({ baseUrl: process.env.MIKSER_URL ?? 'http://localhost:3001' })
    .entities('public', { data: { catalog: 'sitemap' } })

// Use the SAME mapRoute as the runtime router — one source of truth.
// We strip the component function before serializing (functions don't
// JSON-encode); the runtime rehydrates by looking up the component in
// the views table.
const { mapRoute } = await import(resolve(here, '../src/route-mapping.js'))

const routes = (await generateMikserRoutes({ client, mapRoute })).filter(Boolean)

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
