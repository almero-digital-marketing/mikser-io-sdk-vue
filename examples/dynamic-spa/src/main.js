import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createClient } from 'mikser-io-sdk-api'
import { createMikserPlugin } from 'mikser-io-sdk-vue'
import App from './App.vue'

// Scenario D — Dynamic routes.
//
//   No data.catalog. No useMikserRoutes. No /data/sitemap.json snapshot.
//
// Why: when the catalog is past ~5–10k routes, loading every route
// into a snapshot at boot is the wrong shape. Install one catch-all
// instead and resolve the current path against mikser per-navigation.
// The api plugin's `cache: true` writes each unique route's response
// to disk, so a reverse proxy serves repeat visits from the cache
// directly — effectively per-route ISR powered by real traffic.
const documents = createClient({ baseUrl: import.meta.env.VITE_MIKSER_URL })
    .entities('public')

// The app owns the router. ONE catch-all route routes everything
// content-backed; hand-coded routes (Home) come first so they shadow it.
const router = createRouter({
    history: createWebHistory(),
    routes: [
        // Hand-coded routes — not backed by a single catalog document
        { path: '/', name: 'home', component: () => import('./views/Home.vue') },

        // Catch-all → DocumentResolver dispatches via useDocumentByRoute.
        // Must be added last so it doesn't shadow the hand-coded routes.
        { path: '/:pathMatch(.*)*', name: 'doc', component: () => import('./views/DocumentResolver.vue') },
    ],
})

createApp(App)
    .use(createMikserPlugin({ client: documents }))
    .use(router)
    .mount('#app')
