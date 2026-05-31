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
 *       client: documents,
 *       filter: { 'meta.published': true, 'meta.route': { $exists: true } },
 *       mapRoute: document => ({
 *           path: document.meta.route,
 *           name: document.id,
 *           component: () => import('./views/DocumentPage.vue'),
 *           props: route => ({ entityId: document.id, params: route.params }),
 *           meta: { layout: document.meta?.layout },
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
    // cleanly when the document disappears.
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
 * Build-time helper. Enumerates every published catalog entity with a
 * matching filter and applies the mapRoute callback. Returns plain
 * route definitions for use with Vite SSG / Nuxt / any static-build
 * tooling.
 *
 *   // build/routes.mjs
 *   const routes = await generateMikserRoutes({
 *       client: documents,
 *       mapRoute: document => ({ path: document.meta.route, name: document.id, ... }),
 *   })
 *   await writeFile('./src/generated/routes.json', JSON.stringify(routes))
 *
 * Auto-paginates via sdk-api's listAll() under the hood — no manual
 * limit, no silent truncation on large catalogs.
 */
export async function generateMikserRoutes({
    client,
    filter = { 'meta.published': true, 'meta.route': { $exists: true } },
    mapRoute,
} = {}) {
    if (!client)   throw new Error('generateMikserRoutes: { client } is required')
    if (!mapRoute) throw new Error('generateMikserRoutes: { mapRoute } is required')

    const items = await client.listAll({ filter, fields: ['id', 'meta'] })
    return items.map(mapRoute)
}
