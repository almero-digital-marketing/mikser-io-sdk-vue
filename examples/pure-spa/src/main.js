import { createApp } from 'vue'
import { createWebHistory } from 'vue-router'
import { createClient } from 'mikser-io-sdk-api'
import { createMikserPlugin, createMikserRouter } from 'mikser-io-sdk-vue'
import App from './App.vue'
import { mapRoute } from './route-mapping.js'

const documents = createClient({ baseUrl: import.meta.env.VITE_MIKSER_URL })
    .entities('public')

// Async — waits for the initial document list before mounting. For an
// SPA whose entire purpose is content-driven, paying ~100-500ms once at
// boot is fine. The alternative would be a blank shell that fetches on
// every navigation; that's a worse experience for the typical user.
const router = await createMikserRouter({
    client: documents,
    mapRoute,
    staticRoutes: [
        // Hand-coded routes — listing pages aren't backed by a single document
        { path: '/articles', name: 'articles', component: () => import('./views/ArticleIndex.vue') },
        { path: '/',         name: 'home',     component: () => import('./views/Home.vue') },
    ],
    notFoundComponent: () => import('./views/NotFound.vue'),
    history: createWebHistory(),
})

createApp(App)
    .use(createMikserPlugin({ client: documents }))
    .use(router)
    .mount('#app')
