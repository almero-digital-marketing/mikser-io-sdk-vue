// Shared between the public build (build/generate-routes.mjs +
// src/public/router.js) and the editor build (src/editor/router.js).
// One source of truth for "what view does this layout map to."

export const views = {
    article: () => import('./views/ArticleView.vue'),
    product: () => import('./views/ProductView.vue'),
    landing: () => import('./views/LandingView.vue'),
    page:    () => import('./views/PageView.vue'),
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
