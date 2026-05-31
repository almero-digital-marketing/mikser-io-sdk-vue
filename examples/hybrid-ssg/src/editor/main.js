// Editor entry — pure SPA with live updates. Same view components
// as the public build; different router (the editor app owns its
// own createRouter + useMikserRoutes, vs the public build's
// build-time generated manifest) and a different mount point
// (admin.html under /admin/*).
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createClient } from 'mikser-io-sdk-api'
import { createMikserPlugin, useMikserRoutes } from 'mikser-io-sdk-vue'
import { mapRoute } from '../route-mapping.js'
import App from './App.vue'

const documents = createClient({ baseUrl: import.meta.env.VITE_MIKSER_URL })
    .entities('public')

// The editor app owns its own router. Hand-coded admin routes are
// declared here; mikser slots catalog routes in alongside via
// useMikserRoutes below.
const router = createRouter({
    history: createWebHistory('/admin/'),
    routes: [
        { path: '/admin/',         name: 'editor-home',     component: () => import('./EditorHome.vue') },
        { path: '/admin/articles', name: 'editor-articles', component: () => import('../views/ArticleIndex.vue') },
        { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('../views/NotFound.vue') },
    ],
})

// Wire mikser into the same router. Await seeded before mounting so the
// first navigation hits a registered route rather than the NotFound
// catch-all.
const { seeded } = useMikserRoutes(router, {
    client: documents,
    mapRoute,
})
await seeded

createApp(App)
    .use(createMikserPlugin({ client: documents }))
    .use(router)
    .mount('#app')
