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
        'render-hbs',
        'render-markdown',
        'api',
    ],

    layouts: {
        // One generic page.html.hbs catches every doc regardless of
        // meta.layout. The Vue apps do their own per-layout dispatch
        // via the meta.layout field; mikser's rendering is only
        // consumed by scenario C (islands).
        autoLayouts: true,
    },

    api: {
        endpoints: {
            // Open endpoint — anything with meta.published: true is
            // visible. Includes the `subscribe` operation so the
            // useDocument / useDocuments composables can stay live.
            public: {
                query: e => e.type === 'document' && e.meta?.published,
                operations: ['list', 'subscribe'],
            },
        },
    },
}
