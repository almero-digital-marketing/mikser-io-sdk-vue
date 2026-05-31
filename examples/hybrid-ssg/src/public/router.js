// Public router — reads the build-time manifest, rehydrates the
// component for each route by looking up the layout in the shared
// views table.
import routes from '../generated/routes.json'
import { views } from '../route-mapping.js'

export function createRouter() {
    return [
        { path: '/',         component: () => import('../views/Home.vue') },
        { path: '/articles', component: () => import('../views/ArticleIndex.vue') },
        ...routes.map(r => ({
            path:      r.path,
            name:      r.name,
            component: views[r.layout] ?? views.page,
            props:     () => ({ entityId: r.props?.entityId ?? r.name }),
            meta:      { layout: r.layout, title: r.title },
        })),
        { path: '/:pathMatch(.*)*', component: () => import('../views/NotFound.vue') },
    ]
}
