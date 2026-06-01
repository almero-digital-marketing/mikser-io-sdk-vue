// Single source of truth for "what view does this document render through".
// Used by main.js as the mapRoute callback handed to useMikserRoutes.
//
// Dispatch is on meta.component, not meta.layout — layout stays
// reserved for mikser's SSG render pipeline. Keeping them separate
// avoids "layout 'page' not found" warnings when a SPA-only component
// has no matching template.
//
// Lazy-import each view so each ships as its own chunk and only loads
// when the user actually visits a route of that component type.

export const views = {
    article: () => import('./views/ArticleView.vue'),
    product: () => import('./views/ProductView.vue'),
    landing: () => import('./views/LandingView.vue'),
    page:    () => import('./views/PageView.vue'),    // fallback for unknown components
}

// Resolve URL path: prefer meta.route, fall back to entity.destination
// (mikser computes this from source path + cleanUrls). Returns null to
// skip documents with neither — fragments, partials, etc.
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
