// mikser-io-sdk-vue
//
// Vue 3 composables and router integration for a mikser-io server.
// Pairs with mikser-io-sdk-api — get the entities client from there,
// hand it to the plugin, and use the composables anywhere.
//
// Usage:
//
//   // main.js
//   import { createApp } from 'vue'
//   import { createClient } from 'mikser-io-sdk-api'
//   import { createMikserPlugin, createMikserRouter } from 'mikser-io-sdk-vue'
//
//   const docs = createClient({ baseUrl: '...' }).entities('public')
//   const router = await createMikserRouter({ client: docs, mapRoute: ... })
//
//   createApp(App).use(createMikserPlugin({ client: docs })).use(router).mount('#app')
//
//   // any component
//   const { document, loading } = useDocument(() => props.docId)
//   const { documents } = useDocuments({ filter: { type: 'document' } })
//   const { href } = useHref(localeRef)

import { ref, shallowRef, inject, provide, onScopeDispose, watch, unref, isRef, getCurrentScope } from 'vue'

const MIKSER_CLIENT = Symbol('mikser-io.client')
const HREF_INDEX    = Symbol('mikser-io.href-index')
const ASSET_INDEX   = Symbol('mikser-io.asset-index')

// ---------------------------------------------------------------------------
// Plugin + injection
// ---------------------------------------------------------------------------

/**
 * Vue plugin — provides the entities client app-wide via inject().
 *
 *   app.use(createMikserPlugin({ client: docs }))
 */
export function createMikserPlugin({ client } = {}) {
    if (!client) {
        throw new Error('createMikserPlugin: { client } is required')
    }
    return {
        install(app) {
            app.provide(MIKSER_CLIENT, client)
            // Also expose as a global property for template-only use:
            //   <a :href="$mikser.urlFor({ filter: ... })">link</a>
            app.config.globalProperties.$mikser = client
        },
    }
}

/**
 * Inject the configured entities client. Usually you don't need this —
 * useDocument / useDocuments / etc. inject it for you. Useful when you
 * want to make ad-hoc calls (urlFor, render, etc.).
 */
export function useMikserClient() {
    const client = inject(MIKSER_CLIENT, null)
    if (!client) {
        throw new Error(
            'useMikserClient: no client found. Did you install the plugin? ' +
            'app.use(createMikserPlugin({ client }))'
        )
    }
    return client
}

// ---------------------------------------------------------------------------
// Composables — document data
// ---------------------------------------------------------------------------

/**
 * Live single-document composable. Resolves the doc by id and stays in
 * sync with changes via client.live().
 *
 * `id` accepts a string OR a Ref OR a getter — when it changes, the
 * subscription resubscribes against the new id automatically.
 *
 *   const { document, loading, error, refresh } = useDocument(() => props.docId)
 */
export function useDocument(id, { client: clientArg } = {}) {
    const client = clientArg ?? useMikserClient()

    const document = shallowRef(null)
    const loading  = ref(true)
    const error    = ref(null)

    let dispose = null

    function start(currentId) {
        // Tear down any prior subscription before starting the new one.
        dispose?.()
        dispose = null
        document.value = null
        error.value = null

        if (currentId == null || currentId === '') {
            loading.value = false
            return
        }

        loading.value = true
        dispose = client.live(
            { id: currentId },
            (items) => {
                document.value = items[0] ?? null
                loading.value = false
            },
            {
                limit: 1,
                onError: (err) => {
                    error.value = err
                    loading.value = false
                },
            },
        )
    }

    // Initial start + re-start when the id source changes
    if (isRef(id) || typeof id === 'function') {
        watch(
            () => unref(typeof id === 'function' ? id() : id),
            (next) => start(next),
            { immediate: true },
        )
    } else {
        start(id)
    }

    // Auto-cleanup when the surrounding effect scope (component or
    // standalone) is disposed. Works in both contexts.
    if (getCurrentScope()) {
        onScopeDispose(() => { dispose?.(); dispose = null })
    }

    function refresh() {
        const currentId = unref(typeof id === 'function' ? id() : id)
        start(currentId)
    }

    return { document, loading, error, refresh }
}

/**
 * Live list composable. Returns a reactive array of documents that
 * stays in sync with client.live() updates.
 *
 *   const { documents, loading } = useDocuments({
 *       filter: { type: 'document', 'meta.published': true },
 *       sort:   { 'meta.date': -1 },
 *       limit:  20,
 *   })
 *
 * `query` accepts an object, a Ref, or a getter — the subscription
 * re-evaluates when the underlying query changes.
 */
export function useDocuments(query = {}, { client: clientArg } = {}) {
    const client = clientArg ?? useMikserClient()

    const documents = shallowRef([])
    const loading   = ref(true)
    const error     = ref(null)

    let dispose = null

    function start(currentQuery) {
        dispose?.()
        dispose = null
        documents.value = []
        error.value = null
        loading.value = true

        const { filter = {}, sort, fields, limit, skip } = currentQuery ?? {}
        dispose = client.live(
            filter,
            (items) => {
                documents.value = items
                loading.value = false
            },
            {
                sort, fields, limit, skip,
                onError: (err) => {
                    error.value = err
                    loading.value = false
                },
            },
        )
    }

    if (isRef(query) || typeof query === 'function') {
        watch(
            () => unref(typeof query === 'function' ? query() : query),
            (next) => start(next),
            { immediate: true, deep: true },
        )
    } else {
        start(query)
    }

    // Auto-cleanup when the surrounding effect scope (component or
    // standalone) is disposed. Works in both contexts.
    if (getCurrentScope()) {
        onScopeDispose(() => { dispose?.(); dispose = null })
    }

    function refresh() {
        const currentQuery = unref(typeof query === 'function' ? query() : query)
        start(currentQuery)
    }

    return { documents, loading, error, refresh }
}

// ---------------------------------------------------------------------------
// Router integration
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// href() — multilingual URL abstraction
// ---------------------------------------------------------------------------

/**
 * Build and provide a reactive href→{lang: url} index from the catalog.
 * Call once in the app root (or a top-level layout component).
 *
 *   <script setup>
 *   import { useMikserClient, provideHrefIndex } from 'mikser-io-sdk-vue'
 *   provideHrefIndex({ client: useMikserClient() })
 *   </script>
 *
 * Front-matter convention:
 *   meta.href:  '/about'           (logical reference)
 *   meta.lang:  'en'               (which language this doc represents)
 *   meta.route: '/en/about'        (actual URL — what useHref() returns)
 */
export function provideHrefIndex({
    client,
    filter = { 'meta.href': { $exists: true } },
    defaultLang = 'default',
} = {}) {
    if (!client) {
        client = useMikserClient()
    }
    const index = shallowRef({})

    const dispose = client.live(
        filter,
        (docs) => {
            const next = {}
            for (const doc of docs) {
                const ref = doc.meta?.href
                if (!ref) continue
                const lang = doc.meta?.lang ?? defaultLang
                const url  = doc.meta?.route ?? doc.meta?.destination ?? ref
                if (!next[ref]) next[ref] = {}
                next[ref][lang] = url
            }
            index.value = next
        },
        { fields: ['id', 'meta'] },
    )

    if (getCurrentScope()) {
        onScopeDispose(() => dispose?.())
    }

    provide(HREF_INDEX, index)
    return index
}

/**
 * Inject the href index. Returns `{ href, index }`.
 *
 *   const { href } = useHref(localeRef)
 *   <router-link :to="href('/about')">About</router-link>
 *   <a :href="href('/about', 'fr')">Voir en français</a>
 *
 * `defaultLangRef` can be a string, ref, computed, or omitted. When the
 * caller doesn't pass a lang to href(), this is the fallback.
 *
 * Resolution falls back: requested lang → 'default' bucket → any
 * available language → the input reference (so broken refs stay visible
 * instead of silently becoming undefined).
 */
export function useHref(defaultLangRef) {
    const index = inject(HREF_INDEX, null)
    if (!index) {
        throw new Error(
            'useHref: provideHrefIndex() must be called in a parent component first'
        )
    }

    function href(ref, lang) {
        const target = unref(lang) ?? unref(defaultLangRef) ?? 'default'
        const entry = index.value[ref]
        if (!entry) return ref                       // unresolved — pass through
        return entry[target]
            ?? entry['default']
            ?? Object.values(entry)[0]
            ?? ref
    }

    return { href, index }
}

// ---------------------------------------------------------------------------
// asset() — asset / image reference resolution
// ---------------------------------------------------------------------------

/**
 * Build and provide a reactive asset index. Same shape as the href
 * index — call once in the app root, then use `useAsset()` anywhere.
 *
 *   provideAssetIndex({ client: useMikserClient() })
 */
export function provideAssetIndex({
    client,
    filter = { type: 'asset' },
} = {}) {
    if (!client) {
        client = useMikserClient()
    }
    const index = shallowRef({})

    const dispose = client.live(
        filter,
        (assets) => {
            const next = {}
            for (const a of assets) {
                next[a.id] = {
                    url:    a.meta?.destination ?? a.meta?.url ?? a.id,
                    width:  a.meta?.width,
                    height: a.meta?.height,
                    srcset: a.meta?.srcset,
                    alt:    a.meta?.alt,
                    meta:   a.meta,
                }
            }
            index.value = next
        },
        { fields: ['id', 'meta'] },
    )

    if (getCurrentScope()) {
        onScopeDispose(() => dispose?.())
    }

    provide(ASSET_INDEX, index)
    return index
}

/**
 * Inject the asset index. Returns `{ asset, image, index }`.
 *
 *   const { asset, image } = useAsset()
 *   <img v-bind="image('/assets/hero.jpg')" />
 *
 * `asset(ref)` returns the full record (url + dimensions + meta).
 * `image(ref)` returns `{ src, width, height, srcset, alt }` suitable
 * for spreading onto an <img>.
 *
 * Returns null for unresolved refs — components should branch on that.
 */
export function useAsset() {
    const index = inject(ASSET_INDEX, null)
    if (!index) {
        throw new Error(
            'useAsset: provideAssetIndex() must be called in a parent component first'
        )
    }

    function asset(ref) {
        return index.value[ref] ?? null
    }

    function image(ref) {
        const a = index.value[ref]
        if (!a) return null
        return {
            src:    a.url,
            width:  a.width,
            height: a.height,
            srcset: a.srcset,
            alt:    a.alt,
        }
    }

    return { asset, image, index }
}
