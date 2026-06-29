// Document data composables — useDocument (single) and useDocuments (list).
// Both wrap client.live() in reactive refs and dispose cleanly on scope
// teardown (component unmount OR standalone effectScope.stop()).
import { ref, shallowRef, watch, unref, isRef, provide, inject, getCurrentScope, onScopeDispose } from 'vue'
import { useMikserClient } from './plugin.js'

export const CURRENT_DOCUMENT = Symbol('mikser-io.current-document')

/**
 * Live single-document composable. Resolves the document by id and stays in
 * sync with changes via client.live().
 *
 * `id` accepts a string OR a Ref OR a getter — when it changes, the
 * subscription resubscribes against the new id automatically.
 *
 *   const { document, loading, error, refresh } = useDocument(() => props.entityId)
 */
export function useDocument(id, { client: clientArg, expand, fields } = {}) {
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
                fields,
                expand,                  // see ADR-0007 — inline-resolve $-refs
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

        const { filter = {}, sort, fields, limit, skip, expand } = currentQuery ?? {}
        dispose = client.live(
            filter,
            (items) => {
                documents.value = items
                loading.value = false
            },
            {
                sort, fields, limit, skip,
                expand,                  // see ADR-0007 — inline-resolve $-refs
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

    if (getCurrentScope()) {
        onScopeDispose(() => { dispose?.(); dispose = null })
    }

    function refresh() {
        const currentQuery = unref(typeof query === 'function' ? query() : query)
        start(currentQuery)
    }

    return { documents, loading, error, refresh }
}

/**
 * Live single-document lookup by URL route. Resolves the document
 * whose `meta.route` matches the given path; stays subscribed for
 * updates. Use this in the catch-all view of a SPA with dynamic
 * routes — the right shape when the catalog is too large to enumerate
 * via the snapshot/registered-routes approach.
 *
 * Each unique route resolves through the api plugin's per-query cache,
 * so the first user pays an API round-trip and subsequent users get
 * the cached file via the reverse proxy — effectively on-demand SSG
 * with no extra config.
 *
 *   <!-- views/DocumentResolver.vue -->
 *   <script setup>
 *   import { useRoute } from 'vue-router'
 *   import { useDocumentByRoute } from 'mikser-io-sdk-vue'
 *   const route = useRoute()
 *   const { document, loading, error } = useDocumentByRoute(() => route.path)
 *   </script>
 *
 * `path` accepts a string, a Ref, or a getter — the lookup re-runs
 * when the source changes.
 *
 * Extra options:
 *   - `extraFilter`: merged into the filter (default `{ 'meta.published': true }`).
 *     Pass `{}` to disable the published filter; pass other fields to add them.
 *   - `client`: override the default entities client.
 */
export function useDocumentByRoute(path, {
    client: clientArg,
    extraFilter = { 'meta.published': true },
} = {}) {
    const client = clientArg ?? useMikserClient()

    const document = shallowRef(null)
    const loading  = ref(true)
    const error    = ref(null)

    let dispose = null

    function start(currentPath) {
        dispose?.()
        dispose = null
        document.value = null
        error.value = null

        if (currentPath == null || currentPath === '') {
            loading.value = false
            return
        }

        loading.value = true
        const filter = { 'meta.route': currentPath, ...extraFilter }
        dispose = client.live(
            filter,
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

    if (isRef(path) || typeof path === 'function') {
        watch(
            () => unref(typeof path === 'function' ? path() : path),
            (next) => start(next),
            { immediate: true },
        )
    } else {
        start(path)
    }

    if (getCurrentScope()) {
        onScopeDispose(() => { dispose?.(); dispose = null })
    }

    function refresh() {
        const currentPath = unref(typeof path === 'function' ? path() : path)
        start(currentPath)
    }

    return { document, loading, error, refresh }
}

/**
 * Provide the current-route document ONCE at the app root, shared by
 * every descendant via useCurrentDocument(). The third member of the
 * provide-once family alongside provideHrefIndex / provideAssetIndex —
 * for the singular ambient "current page" document that a content SPA
 * reads everywhere.
 *
 * Without this, each component calling useDocumentByRoute() opens its
 * own identical live subscription to the same document. This opens ONE,
 * re-keyed as the route changes, and shares the reactive result.
 *
 *   // App.vue (root) — once
 *   import { useRoute } from 'vue-router'
 *   const route = useRoute()
 *   provideCurrentDocument({ route: () => route.path })
 *
 *   // any descendant
 *   const { document } = useCurrentDocument()
 *
 * `route` is a reactive path source (getter / ref / string) — typically
 * `() => useRoute().path`. The SDK stays decoupled from vue-router; the
 * app supplies the path. `resolve` maps a path to the lookup filter
 * (default `meta.route === path`); override for apps that resolve the
 * current document differently. `extraFilter` is merged in (default
 * none — pass `{ 'meta.published': true }` to require published).
 */
export function provideCurrentDocument({
    route,
    client: clientArg,
    resolve = (path) => ({ 'meta.route': path }),
    extraFilter = {},
    fields,
    expand,
} = {}) {
    if (route == null) {
        throw new Error('provideCurrentDocument: { route } is required (a path string, ref, or getter)')
    }
    const client = clientArg ?? useMikserClient()

    const document = shallowRef(null)
    const loading  = ref(true)
    let dispose = null

    function start(path) {
        dispose?.()
        dispose = null
        document.value = null

        if (path == null || path === '') {
            loading.value = false
            return
        }

        loading.value = true
        const filter = { ...resolve(path), ...extraFilter }
        dispose = client.live(
            filter,
            (items) => {
                document.value = items[0] ?? null
                loading.value = false
            },
            { limit: 1, fields, expand, onError: () => { loading.value = false } },
        )
    }

    watch(
        () => unref(typeof route === 'function' ? route() : route),
        (path) => start(path),
        { immediate: true },
    )

    if (getCurrentScope()) {
        onScopeDispose(() => { dispose?.(); dispose = null })
    }

    const ctx = { document, loading }
    provide(CURRENT_DOCUMENT, ctx)
    return ctx
}

/**
 * Inject the shared current-route document. Returns `{ document,
 * loading }`. Requires provideCurrentDocument() in a parent.
 *
 *   const { document } = useCurrentDocument()
 *   <h1>{{ document?.meta.title }}</h1>
 */
export function useCurrentDocument() {
    const ctx = inject(CURRENT_DOCUMENT, null)
    if (!ctx) {
        throw new Error(
            'useCurrentDocument: provideCurrentDocument() must be called in a parent component first'
        )
    }
    return ctx
}
