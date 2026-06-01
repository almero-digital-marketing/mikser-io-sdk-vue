// Shared mikser server for the three Vue example projects.
//
//  - documents/ holds the content tree (en + bg for the multilingual demo)
//  - layouts/ holds a single page.html.hbs that includes island mount
//    points — used only by the `islands` example; the `pure-spa` and
//    `hybrid-ssg` examples consume the api, not the rendered HTML
//  - The `api` plugin exposes a `public` endpoint with `subscribe` so
//    `useDocument` / `useDocuments` / `live()` work in the Vue apps
//  - cors is on by default (since 6.21.6) so the Vue dev servers on
//    different ports can fetch + subscribe without extra config

export default {
    plugins: [
        'documents',
        'front-matter',
        'yaml',
        'layouts',
        'plugin-schemas',
        'render-hbs',
        'render-markdown',
        'api',
    ],

    layouts: {
        // One generic page.html.hbs catches every document regardless of
        // meta.layout. The Vue apps do their own per-layout dispatch
        // via the meta.layout field; mikser's rendering is only
        // consumed by scenario C (islands).
        autoLayouts: true,
    },

    schemas: {
        // 'warn' (the default) is deliberately kept here so the demo
        // surfaces mistyped front-matter as a server log line without
        // failing the build. Flip to 'fail' for CI strictness.
        onError: 'warn',
        // The generated declaration file is consumed by the Vue
        // example projects — see e.g. hybrid-ssg/src/router.js for how
        // it's imported.
        typesFile: 'entities.d.ts',
        // Schemas match documents by meta.component, not meta.layout —
        // layout stays free for mikser's SSG render pipeline (which
        // the islands example uses). component is what the SPA's
        // viewForComponent dispatch table keys off.
        layoutKey: 'meta.component',
    },

    api: {
        endpoints: {
            // Full-content read endpoint. Used by useDocument(id) and
            // anywhere else that needs the actual document body. Stays
            // uncached on purpose: per-id fetches are small enough on
            // their own, and a broad list call (no filter) would dump
            // the whole catalog into a single cache file on disk. The
            // sitemap endpoint below is the narrow, cached one.
            public: {
                query: e => e.type === 'document' && e.meta?.published,
                operations: ['list', 'subscribe'],
            },
            // Narrow router data — every doc with a meta.component.
            // Drives the SPA's useMikserRoutes; small payload, also
            // cached to disk for failover.
            sitemap: {
                query: e =>
                    e.type === 'document' &&
                    e.meta?.published &&
                    e.meta?.component,
                operations: ['list', 'subscribe'],
                // Server-enforced projection. Without this the cached
                // file (cache: true) would contain every entity field —
                // markdown body, internal uri, stamp, all meta fields —
                // and be served publicly at a static URL. The router
                // only needs these five.
                fields: [
                    'id',
                    'destination',
                    'meta.route',
                    'meta.component',
                    'meta.title',
                ],
                cache: true,
            },
        },
    },
}
