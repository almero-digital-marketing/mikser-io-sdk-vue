// Editor entry — pure SPA with live updates. Same view components
// as the public build; different router (createMikserRouter instead
// of static manifest) and different mount point (admin.html).
import { createApp } from 'vue'
import { createWebHistory } from 'vue-router'
import { createClient } from 'mikser-io-sdk-api'
import { createMikserPlugin, createMikserRouter } from 'mikser-io-sdk-vue'
import { mapRoute } from '../route-mapping.js'
import App from './App.vue'

const documents = createClient({ baseUrl: import.meta.env.VITE_MIKSER_URL })
    .entities('public')

const router = await createMikserRouter({
    client: documents,
    mapRoute,
    staticRoutes: [
        { path: '/admin/',         name: 'editor-home',     component: () => import('./EditorHome.vue') },
        { path: '/admin/articles', name: 'editor-articles', component: () => import('../views/ArticleIndex.vue') },
    ],
    notFoundComponent: () => import('../views/NotFound.vue'),
    history: createWebHistory('/admin/'),
})

createApp(App)
    .use(createMikserPlugin({ client: documents }))
    .use(router)
    .mount('#app')
