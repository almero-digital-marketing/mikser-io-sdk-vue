// Public router — reads the build-time manifest, rehydrates the
// component for each route by looking up meta.component in the
// shared views table.
import routes from '../generated/routes.json'
import { views } from '../route-mapping.js'

export function createRouter() {
    return [
        { path: '/',         component: () => import('../views/Home.vue') },
        { path: '/articles', component: () => import('../views/ArticleIndex.vue') },
        ...routes.map(r => ({
            path:      r.path,
            name:      r.name,
            component: views[r.component] ?? views.page,
            props:     () => ({ entityId: r.props?.entityId ?? r.name }),
            meta:      { component: r.component, title: r.title },
        })),
        { path: '/:pathMatch(.*)*', component: () => import('../views/NotFound.vue') },
    ]
}
