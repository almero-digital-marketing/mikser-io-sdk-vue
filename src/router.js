// Router integration — async factory that builds a Vue Router with
// routes seeded from the catalog and kept in sync via client.live().
// Plus the build-time list-only generator used by SSG pipelines.
//
// vue-router is an optional peer dep; we lazy-import it so projects
// that don't use the router helpers pay nothing for their absence.

/**
 * Build a Vue Router instance whose routes come from the mikser catalog.
 * Static routes (hand-coded) and dynamic content routes coexist; the
 * latter stay in sync via client.live() — new content adds routes,
 * deleted content removes them, without a page reload.
 *
 *   const router = await createMikserRouter({
 *       client: docs,
 *       filter: { 'meta.published': true, 'meta.route': { $exists: true } },
 *       mapRoute: doc => ({
 *           path: doc.meta.route,
 *           name: doc.id,
 *           component: () => import('./views/DocumentPage.vue'),
 *           props: route => ({ docId: doc.id, params: route.params }),
 *           meta: { layout: doc.meta?.layout },
 *       }),
 *       staticRoutes: [...],
 *       notFoundComponent: () => import('./views/NotFound.vue'),
 *       history: createWebHistory(),
 *   })
 */
export async function createMikserRouter({
    client,
    filter = { 'meta.published': true, 'meta.route': { $exists: true } },
    mapRoute,
    staticRoutes = [],
    notFoundComponent = null,
    history,
    routerOptions = {},
} = {}) {
    if (!client)   throw new Error('createMikserRouter: { client } is required')
    if (!mapRoute) throw new Error('createMikserRouter: { mapRoute } is required')
    if (!history)  throw new Error('createMikserRouter: { history } is required (createWebHistory()/createMemoryHistory())')

    // Lazy-import vue-router so projects that don't need it pay nothing
    const { createRouter } = await import('vue-router')

    const { items } = await client.list({
        filter,
        fields: ['id', 'meta'],
        limit:  10_000,
    })

    const initialContent = items.map(mapRoute)
    const trailing = notFoundComponent
        ? [{ path: '/:pathMatch(.*)*', name: 'NotFound', component: notFoundComponent }]
        : []

    const router = createRouter({
        history,
        routes: [...staticRoutes, ...initialContent, ...trailing],
        ...routerOptions,
    })

    // Track which content routes we've added so we can remove them
    // cleanly when the doc disappears.
    const contentRouteNames = new Set(initialContent.map(r => r.name).filter(Boolean))

    client.live(
        filter,
        (currentDocs) => {
            const desired = new Map(
                currentDocs
                    .map(d => {
                        const r = mapRoute(d)
                        return r?.name ? [r.name, r] : null
                    })
                    .filter(Boolean),
            )

            // Add new
            for (const [name, route] of desired) {
                if (!contentRouteNames.has(name)) {
                    router.addRoute(route)
                    contentRouteNames.add(name)
                }
            }
            // Remove vanished
            for (const name of contentRouteNames) {
                if (!desired.has(name)) {
                    router.removeRoute(name)
                    contentRouteNames.delete(name)
                }
            }
        },
        { fields: ['id', 'meta'] },
    )

    return router
}

/**
 * Build-time helper. Calls client.list() once and returns plain route
 * definitions for use with Vite SSG / Nuxt / any static-build tooling.
 *
 *   // build/routes.mjs
 *   const routes = await generateMikserRoutes({
 *       client: docs,
 *       mapRoute: doc => ({ path: doc.meta.route, name: doc.id, ... }),
 *   })
 *   await writeFile('./src/generated/routes.json', JSON.stringify(routes))
 */
export async function generateMikserRoutes({
    client,
    filter = { 'meta.published': true, 'meta.route': { $exists: true } },
    mapRoute,
} = {}) {
    if (!client)   throw new Error('generateMikserRoutes: { client } is required')
    if (!mapRoute) throw new Error('generateMikserRoutes: { mapRoute } is required')

    const { items } = await client.list({
        filter,
        fields: ['id', 'meta'],
        limit:  10_000,
    })
    return items.map(mapRoute)
}
