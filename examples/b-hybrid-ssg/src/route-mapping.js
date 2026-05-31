// Shared between the public build (build/generate-routes.mjs +
// src/public/router.js) and the editor build (src/editor/router.js).
// One source of truth for "what view does this layout map to."

export const views = {
    article: () => import('./views/ArticleView.vue'),
    product: () => import('./views/ProductView.vue'),
    landing: () => import('./views/LandingView.vue'),
    page:    () => import('./views/PageView.vue'),
}

export function mapRoute(doc) {
    return {
        path:      doc.meta.route,
        name:      doc.id,
        component: views[doc.meta.layout] ?? views.page,
        props:     route => ({ entityId: doc.id, params: route.params }),
        meta: {
            layout: doc.meta?.layout,
            title:  doc.meta?.title,
        },
    }
}
