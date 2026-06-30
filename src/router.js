// Router integration — three shapes. Mikser augments your app's router;
// it doesn't own it.
//
//   useMikserRoutes(router, opts) — applies catalog routes to an
//                                      EXISTING vue-router instance via
//                                      addRoute / removeRoute. Your app
//                                      constructs its own router with
//                                      hand-coded routes; mikser slots in
//                                      alongside. Returns { dispose, seeded }.
//
//   generateMikserRoutes(opts)        — one-shot Promise<RouteRecordRaw[]>
//                                      for build-time / SSG. No
//                                      subscription, no router involvement.
//
//   createMikserHistory(history)      — wraps a vue-router history so
//                                      non-ASCII (localized) route paths
//                                      match on deep-load. Takes the base
//                                      history so this module never imports
//                                      vue-router (its optional peer).
//
// For anything else (admin pickers listing documents, sitemap UIs,
// debug panels), use useDocuments — it gives you the live document
// records directly, which carry strictly more information than a
// post-mapRoute RouteRecordRaw array.
import { getCurrentScope, onScopeDispose } from 'vue'
import { useMikserClient } from './plugin.js'

const DEFAULT_FILTER = { 'meta.published': true, 'meta.route': { $exists: true } }

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
 *   const { seeded } = useMikserRoutes(router, {
 *       mapRoute: document => ({
 *           path:      document.meta.route,
 *           name:      document.id,        // required for diff tracking
 *           component: () => import('./views/DocumentPage.vue'),
 *           props:     { entityId: document.id },
 *       }),
 *   })
 *   await seeded   // first-paint nav hits a registered route
 *
 * Returns `{ dispose, seeded }`:
 *  - `dispose()` stops the live subscription. Idempotent. Also runs
 *    automatically on the surrounding effect scope's teardown.
 *  - `seeded` resolves the first time the initial catalog list has
 *    landed and routes have been registered.
 *
 * Notes:
 *  - Routes returned without a `name` are silently skipped — they
 *    can't be tracked across catalog updates.
 *  - addRoute on a duplicate name overwrites the previous registration;
 *    this helper guards against that by only calling addRoute for names
 *    it hasn't tracked yet, so coexisting static routes with the same
 *    name as catalog entities is a name collision the caller must avoid.
 */
export function useMikserRoutes(router, {
    client: clientArg,
    filter = DEFAULT_FILTER,
    mapRoute,
} = {}) {
    if (!router)   throw new Error('useMikserRoutes: router is required')
    if (!mapRoute) throw new Error('useMikserRoutes: { mapRoute } is required')
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
// Implementation lives in mikser-io-sdk-api so all three framework SDKs
// share the same enumeration + filter defaults. Re-export here so Vue
// users still import it from their framework package.
export { generateMikserRoutes } from 'mikser-io-sdk-api'

/**
 * Wrap a vue-router history so localized (non-ASCII) route paths match on
 * deep-load and refresh.
 *
 *   const router = createRouter({
 *       history: createMikserHistory(createWebHistory()),
 *       routes,
 *   })
 *
 * Why it's needed: a route defined with a readable Unicode path (e.g.
 * `/запазване-час`, the kind generateMikserRoutes emits from a localized
 * `meta.route`) is stored decoded, but on a deep-load/refresh the browser
 * hands vue-router a percent-encoded `location.pathname`
 * (`/%D0%B7%D0%B0%D0%BF...`) that won't match it — you get a spurious "No
 * match" and a blank view. In-app navigation works (push targets are
 * already decoded); only the initial-from-URL case breaks.
 *
 * This wraps the *base* history (you pass `createWebHistory()` /
 * `createWebHashHistory()`) and decodes the location vue-router reads — on
 * the `location` getter and the `listen()` callback — with `decodeURI`
 * (not decodeURIComponent, so `/ ? #` stay structural). Routes stay
 * readable, matching is decoded-vs-decoded, and there's no redirect or
 * catch-all. Taking the history as an argument keeps this module from
 * importing vue-router (its optional peer).
 *
 * @template {object} H
 * @param {H} history  A vue-router RouterHistory (createWebHistory(), …).
 * @returns {H}
 */
export function createMikserHistory(history) {
    const decode = (loc) => {
        if (typeof loc !== 'string') return loc
        try { return decodeURI(loc) } catch { return loc }
    }
    return new Proxy(history, {
        get(target, prop) {
            if (prop === 'location') return decode(target.location)
            if (prop === 'listen') {
                return (cb) => target.listen((to, from, info) => cb(decode(to), decode(from), info))
            }
            const value = target[prop]
            return typeof value === 'function' ? value.bind(target) : value
        },
    })
}

/**
 * Dev-mode safety net for the silent "no route matched → blank view" class.
 * vue-router renders an empty <router-view> on an unmatched navigation with
 * no error — the failure looks like a broken page, not a bad URL.
 *
 * Catalog routes carry the canonical href as their `name` and the (often
 * localized) destination as their `path` — so the most common miss is
 * reaching for the canonical href *as a path* (`/web` when the route lives
 * at `/`, `/web/club/login` when it lives at `/клуб/вход`). This hooks
 * `afterEach`; on an unmatched landing it warns, and when the attempted path
 * is itself a known route name it points at the real route. Pairs with
 * createMikserHistory(), which fixes the *other* No-match class (deep-loading
 * a percent-encoded localized path).
 *
 *   if (import.meta.env.DEV) watchUnmatchedRoutes(router)
 *
 * Returns vue-router's afterEach teardown; no-op without a router. This only
 * reports — to actually render something on a miss, add a catch-all route.
 *
 * @param {import('vue-router').Router} router
 * @param {{ warn?: (message: string) => void }} [options]
 * @returns {() => void}
 */
export function watchUnmatchedRoutes(router, { warn = console.warn } = {}) {
    if (!router || typeof router.afterEach !== 'function') return () => {}
    return router.afterEach((to) => {
        if (to.matched && to.matched.length) return
        let hint = ''
        // The attempted path is itself a registered route NAME → a canonical
        // href used where a path belongs. Resolve the name to its real path.
        if (router.hasRoute?.(to.path)) {
            try {
                const target = router.resolve({ name: to.path })
                hint =
                    `\n  '${to.path}' is a route name (a canonical href), not a path — ` +
                    `its route is '${target.path}'. Navigate by name ` +
                    `(router.push({ name: '${to.path}' })) or use that path.`
            } catch {
                // Name needs params we don't have — skip the path hint.
            }
        }
        warn(`[mikser] no route matched '${to.fullPath}' — <router-view> will render empty.${hint}`)
    })
}
