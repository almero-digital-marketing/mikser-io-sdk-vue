// Router integration — three shapes. Mikser augments your app's router;
// it doesn't own it.
//
//   useMikserRoutesSync(router, opts) — applies catalog routes to an
//                                      EXISTING vue-router instance via
//                                      addRoute / removeRoute. The
//                                      common case: your app constructs
//                                      its own router with hand-coded
//                                      routes; mikser slots in alongside.
//                                      Returns { dispose, seeded }.
//
//   useMikserRoutes(opts)            — returns a Ref<RouteRecordRaw[]>
//                                      that stays in sync. Right when
//                                      you want catalog routes as data —
//                                      to feed a single createRouter()
//                                      call at boot, or to project into
//                                      other UI (admin pickers, sitemaps,
//                                      debug panels).
//
//   generateMikserRoutes(opts)        — one-shot Promise<RouteRecordRaw[]>
//                                      for build-time / SSG. No
//                                      subscription, no router involvement.
import { shallowRef, getCurrentScope, onScopeDispose } from 'vue'
import { useMikserClient } from './plugin.js'

const DEFAULT_FILTER = { 'meta.published': true, 'meta.route': { $exists: true } }

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

    // `seeded` resolves the first time onChange fires (i.e. the initial
    // catalog list has landed and routes have been registered). Right
    // when the consumer wants to await before mount so navigation hits a
    // registered route on first paint rather than a 404 → re-register
    // → re-navigate flicker.
    let resolveSeeded
    const seeded = new Promise(resolve => { resolveSeeded = resolve })
    let firstFire = true

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
            if (firstFire) {
                firstFire = false
                resolveSeeded()
            }
        },
        { fields: ['id', 'meta'] },
    )

    if (getCurrentScope()) {
        onScopeDispose(() => dispose?.())
    }

    return { dispose, seeded }
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
