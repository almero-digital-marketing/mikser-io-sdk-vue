// Shared between the public build (build/generate-routes.mjs +
// src/public/router.js) and the editor build (src/editor/router.js).
// One source of truth for "what view does this component map to."
//
// Dispatch is on meta.component, not meta.layout — layout stays
// reserved for mikser's SSG render pipeline (which the islands
// example uses). Documents in Hybrid SSG can set both without
// collision.

export const views = {
    article: () => import('./views/ArticleView.vue'),
    product: () => import('./views/ProductView.vue'),
    landing: () => import('./views/LandingView.vue'),
    page:    () => import('./views/PageView.vue'),
}

// Resolve URL path: prefer meta.route, fall back to destination.
function routeFor(document) {
    if (document.meta?.route) return document.meta.route
    if (document.destination) {
        return document.destination
            .replace(/\/index\.html?$/, '/')
            .replace(/\.html?$/, '')
    }
    return null
}

export function mapRoute(document) {
    const path = routeFor(document)
    if (!path) return null
    return {
        path,
        name:      document.id,
        component: views[document.meta?.component] ?? views.page,
        props:     route => ({ entityId: document.id, params: route.params }),
        meta: {
            component: document.meta?.component,
            title:     document.meta?.title,
        },
    }
}
