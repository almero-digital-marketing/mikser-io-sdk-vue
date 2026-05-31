// Public entry point — SSG-rendered, no live updates.
// The router reads its routes from the build-time manifest at
// src/generated/routes.json. No client.list() at boot, no SSE.
//
// We still install the mikser plugin so individual components can
// do client.list() / urlFor() if needed (e.g. a related-posts
// section), but they don't subscribe at runtime — that's the
// editor's job.
import { ViteSSG } from 'vite-ssg'
import { createClient } from 'mikser-io-sdk-api'
import { createMikserPlugin } from 'mikser-io-sdk-vue'
import { createRouter } from './router.js'
import App from './App.vue'

const docs = createClient({ baseUrl: import.meta.env.VITE_MIKSER_URL })
    .entities('public')

export const createApp = ViteSSG(
    App,
    { routes: createRouter() },
    ({ app }) => {
        app.use(createMikserPlugin({ client: docs }))
    },
)
