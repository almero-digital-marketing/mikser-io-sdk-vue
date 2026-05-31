// Router integration — three shapes, pick whichever fits your app:
//
//   createMikserRouter(opts)         — async factory that BUILDS a new
//                                      Vue Router and keeps it in sync.
//                                      Right when mikser owns routing.
//
//   useMikserRoutes(opts)            — returns a shallowRef<RouteRecordRaw[]>
//                                      that stays in sync. Right when you
//                                      want catalog routes as data — feed
//                                      them into your own createRouter()
//                                      call or compose with other route
//                                      sources.
//
//   useMikserRoutesSync(router, opts) — applies catalog routes to an
//                                      EXISTING vue-router instance via
//                                      addRoute / removeRoute. Right when
//                                      you already have a router with your
//                                      own static routes and want mikser
//                                      to slot in alongside them.
//
//   generateMikserRoutes(opts)        — one-shot Promise<RouteRecordRaw[]>
//                                      for build-time / SSG. No subscription.
//
// vue-router is an optional peer dep; createMikserRouter lazy-imports it
// so projects that don't use the router helpers pay nothing for its absence.
import { shallowRef, getCurrentScope, onScopeDispose } from 'vue'
import { useMikserClient } from './plugin.js'

const DEFAULT_FILTER = { 'meta.published': true, 'meta.route': { $exists: true } }

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
 * Live reactive list of route records from the mikser catalog. Returns
 * a shallowRef<RouteRecordRaw[]> that re-assigns its `.value` whenever
 * a matching entity is created / updated / deleted server-side.
 *
 *   <script setup>
 *   import { createRouter, createWebHistory } from 'vue-router'
 *   import { useMikserRoutes } from 'mikser-io-sdk-vue'
 *
 *   const mikserRoutes = useMikserRoutes({
 *       mapRoute: document => ({
 *           path: document.meta.route,
 *           name: document.id,
 *           component: () => import('./views/DocumentPage.vue'),
 *           props: { entityId: document.id },
 *       }),
 *   })
 *
 *   // Compose with your own routes — read mikserRoutes.value in a
 *   // computed/watch, build your routes array, hand to createRouter().
 *   </script>
 *
 * For an existing router you'd rather not rebuild, see
 * `useMikserRoutesSync` — it applies the same data via addRoute /
 * removeRoute instead of asking the caller to wire the diff manually.
 *
 * Automatic teardown on component unmount (or standalone effectScope.stop()).
 */
export function useMikserRoutes({
    client: clientArg,
    filter = DEFAULT_FILTER,
    mapRoute,
} = {}) {
    if (!mapRoute) throw new Error('useMikserRoutes: { mapRoute } is required')
    const client = clientArg ?? useMikserClient()

    const routes = shallowRef([])

    const dispose = client.live(
        filter,
        (documents) => {
            routes.value = documents.map(mapRoute).filter(Boolean)
        },
        { fields: ['id', 'meta'] },
    )

    if (getCurrentScope()) {
        onScopeDispose(() => dispose?.())
    }

    return routes
}

/**
 * Keep an existing vue-router instance in sync with the mikser catalog
 * via addRoute / removeRoute. Right when you already have your own
 * router (with hand-coded routes, named routes, custom guards, etc.)
 * and want mikser-driven routes to coexist with them, without
 * rebuilding the whole router.
 *
 *   const router = createRouter({
 *       history: createWebHistory(),
 *       routes: [
 *           { path: '/login', name: 'login', component: Login },
 *           { path: '/admin', name: 'admin', component: Admin },
 *       ],
 *   })
 *   app.use(router)
 *
 *   // Slot mikser routes alongside the hand-coded ones. mapRoute MUST
 *   // return routes with a unique `name` — addRoute / removeRoute use
 *   // it as the diff key.
 *   useMikserRoutesSync(router, {
 *       mapRoute: document => ({
 *           path:      document.meta.route,
 *           name:      document.id,        // required for diff tracking
 *           component: () => import('./views/DocumentPage.vue'),
 *           props:     { entityId: document.id },
 *       }),
 *   })
 *
 * Returns a dispose function. Also auto-disposes on the surrounding
 * effect scope's teardown (component unmount).
 *
 * Notes:
 *  - Routes returned without a `name` are silently skipped — they
 *    can't be tracked across catalog updates.
 *  - addRoute on a duplicate name overwrites the previous registration;
 *    this helper guards against that by only calling addRoute for names
 *    it hasn't tracked yet, so coexisting static routes with the same
 *    name as catalog entities is a name collision the caller must avoid.
 */
export function useMikserRoutesSync(router, {
    client: clientArg,
    filter = DEFAULT_FILTER,
    mapRoute,
} = {}) {
    if (!router)   throw new Error('useMikserRoutesSync: router is required')
    if (!mapRoute) throw new Error('useMikserRoutesSync: { mapRoute } is required')
    const client = clientArg ?? useMikserClient()

    const tracked = new Set()

    const dispose = client.live(
        filter,
        (documents) => {
            const desired = new Map()
            for (const document of documents) {
                const route = mapRoute(document)
                if (route?.name) desired.set(route.name, route)
            }
            // Add newly-appearing routes
            for (const [name, route] of desired) {
                if (!tracked.has(name)) {
                    router.addRoute(route)
                    tracked.add(name)
                }
            }
            // Remove vanished routes
            for (const name of tracked) {
                if (!desired.has(name)) {
                    router.removeRoute(name)
                    tracked.delete(name)
                }
            }
        },
        { fields: ['id', 'meta'] },
    )

    if (getCurrentScope()) {
        onScopeDispose(() => dispose?.())
    }

    return dispose
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
