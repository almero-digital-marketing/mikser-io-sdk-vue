// Single source of truth for "what view does this document render through".
// Used by main.js as the mapRoute callback handed to useMikserRoutes.
//
// Lazy-import each view so each ships as its own chunk and only loads
// when the user actually visits a route of that layout.

export const views = {
    article: () => import('./views/ArticleView.vue'),
    product: () => import('./views/ProductView.vue'),
    landing: () => import('./views/LandingView.vue'),
    page:    () => import('./views/PageView.vue'),    // fallback for unknown layouts
}

export function mapRoute(document) {
    return {
        path:      document.meta.route,
        name:      document.id,
        component: views[document.meta.layout] ?? views.page,
        props:     route => ({ entityId: document.id, params: route.params }),
        meta: {
            layout: document.meta?.layout,
            title:  document.meta?.title,
        },
    }
}
