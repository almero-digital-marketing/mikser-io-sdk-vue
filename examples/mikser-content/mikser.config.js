// Shared mikser server for the three Vue example projects.
//
//  - documents/ holds the content tree (en + bg for the multilingual demo)
//  - layouts/ holds a single page.html.hbs that includes island mount
//    points — used only by the `islands` example; the `pure-spa` and
//    `hybrid-ssg` examples consume the api, not the rendered HTML
//  - The `api` plugin exposes a single `public` endpoint with subscribe
//    so `useDocument` / `useDocuments` / `live()` work in the Vue apps
//  - The `data` plugin writes `out/data/sitemap.json` — a fields-narrow
//    snapshot the SDK loads via `data.catalog` for first-paint routing.
//    No second API endpoint, no per-query disk cache for routes; just
//    one static file served by mikser's built-in static handler.
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
        'data',
        'api',
    ],

    layouts: {
        // One generic page.html.hbs catches every document regardless of
        // meta.layout. The Vue apps do their own per-component dispatch
        // via meta.component; mikser's rendering is only consumed by
        // scenario C (islands).
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
        schemaKey: 'meta.component',
    },

    data: {
        // The data plugin is mikser's static-content essence: every
        // catalog and entity that gets configured here lands as a JSON
        // file under out/data/, served by the built-in static handler.
        // CDN-cacheable, survives the engine being down, and the SDK
        // reads from these files first before falling back to the API.
        catalog: {
            // out/data/sitemap.json — every published document that
            // declares a meta.component, projected to just the fields
            // the router needs. Consumed by the SDK via
            //   entities('public', { data: { catalog: 'sitemap', entities: 'page' } })
            sitemap: {
                query: e =>
                    e.type === 'document' &&
                    e.meta?.published &&
                    e.meta?.component,
                pick: ['id', 'destination', 'meta.component', 'meta.route', 'meta.title'],
            },
        },
        entities: {
            // out/data/<entity.name>.page.json — one file per published
            // document, with full content. Consumed by the SDK via
            //   entities('public', { data: { entities: 'page' } })
            // so useDocument(id) reads from disk on first paint instead
            // of hitting the API. Live updates still flow over SSE.
            page: {
                query: e => e.type === 'document' && e.meta?.published,
                pick: ['id', 'meta', 'content'],
            },
        },
    },

    api: {
        endpoints: {
            // Full-content read endpoint. Used by useDocument(id) and
            // anywhere else that needs the actual document body —
            // returns the whole entity, no projection. `cache: true` is
            // for fail-safety: when mikser is down a reverse proxy can
            // still serve the cached per-id responses so a user reading
            // a document keeps reading it. Initial route data comes from
            // the static sitemap.json (above), not from this endpoint.
            public: {
                query: e => e.type === 'document' && e.meta?.published,
                operations: ['list', 'subscribe'],
                cache: true,
            },
        },
    },
}
