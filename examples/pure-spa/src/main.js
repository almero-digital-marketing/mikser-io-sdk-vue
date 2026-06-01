import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createClient } from 'mikser-io-sdk-api'
import { createMikserPlugin, useMikserRoutes } from 'mikser-io-sdk-vue'
import { mapRoute } from './route-mapping.js'
import App from './App.vue'

// One client, one endpoint. initialUrl points at the static snapshot
// the data plugin writes (out/data/sitemap.json) — that's the fast
// first-paint path for routes. After the snapshot lands the SDK opens
// a live SSE subscribe on the same /public endpoint for incremental
// updates. No second API endpoint, no second cache file — just one
// CDN-cacheable static file plus the existing live channel.
const documents = createClient({ baseUrl: import.meta.env.VITE_MIKSER_URL })
    .entities('public', { initialUrl: '/data/sitemap.json' })

// The app owns the router. Static routes are hand-coded; mikser slots
// catalog routes in alongside via useMikserRoutes below.
const router = createRouter({
    history: createWebHistory(),
    routes: [
        // Hand-coded routes — listing pages aren't backed by a single document
        { path: '/articles', name: 'articles', component: () => import('./views/ArticleIndex.vue') },
        { path: '/',         name: 'home',     component: () => import('./views/Home.vue') },
        // Catch-all 404 — must be added last so it doesn't shadow content
        // routes registered by the sync loop.
        { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('./views/NotFound.vue') },
    ],
})

// Wire mikser into the same router. seeded resolves when the initial
// snapshot (or list fallback) lands; await it before mounting so
// first-paint navigation hits a registered route instead of falling
// through to NotFound and re-navigating once routes appear.
const { seeded } = useMikserRoutes(router, { mapRoute })
await seeded

createApp(App)
    .use(createMikserPlugin({ client: documents }))
    .use(router)
    .mount('#app')
