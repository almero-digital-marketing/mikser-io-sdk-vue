// Vector integration — bridges the mikser-io-sdk-vector client into a
// Vue-shaped reactive primitive. Same provide/inject shape as the
// documents plugin, just for a different client.
//
// mikser-io-sdk-vector is an OPTIONAL runtime dependency. The framework
// SDK doesn't import it — the consumer constructs the vector client
// themselves and passes it in via createMikserVectorPlugin. Projects
// that don't use semantic search pay nothing.
import { ref, shallowRef, watch, inject, provide, getCurrentScope, onScopeDispose } from 'vue'

export const MIKSER_VECTOR_CLIENT = Symbol('mikser-io.vector-client')

/**
 * Vue plugin — provides the vector client app-wide via inject().
 *
 *   import { createClient as createVectorClient } from 'mikser-io-sdk-vector'
 *   import { createMikserVectorPlugin } from 'mikser-io-sdk-vue'
 *
 *   const similar = createVectorClient({ baseUrl: VITE_MIKSER_URL })
 *   app.use(createMikserVectorPlugin({ client: similar }))
 */
export function createMikserVectorPlugin({ client } = {}) {
    if (!client) {
        throw new Error('createMikserVectorPlugin: { client } is required')
    }
    return {
        install(app) {
            app.provide(MIKSER_VECTOR_CLIENT, client)
        },
    }
}

/**
 * Inject the configured vector client. Useful for ad-hoc calls; the
 * useSimilar composable injects it for you.
 */
export function useMikserVectorClient() {
    const client = inject(MIKSER_VECTOR_CLIENT, null)
    if (!client) {
        throw new Error(
            'useMikserVectorClient: no vector client found. Did you install ' +
            'the plugin? app.use(createMikserVectorPlugin({ client }))'
        )
    }
    return client
}

/**
 * Live semantic search composable. Accepts a reactive query (string,
 * Ref, or getter) and re-fires the search whenever it changes,
 * debounced. Stale results from races are discarded — only the most
 * recently-issued query's response can update `results`.
 *
 *   const q = ref('')
 *   const { results, loading, error, refresh } = useSimilar(
 *       'documents',
 *       () => q.value,
 *       { limit: 10, debounce: 200, minLength: 2 },
 *   )
 *
 *   results.value === [{ id, distance, data: { title, summary, ... } }, ...]
 *
 * Configuration:
 *
 *   limit     — max hits per request. Default 5.
 *   debounce  — ms to wait after the last keystroke before firing.
 *               Default 200. Set to 0 to fire immediately.
 *   minLength — skip the request below this query length. Default 1
 *               (empty string never fires; 'a' fires).
 *   client    — override the injected vector client. Rare.
 *
 * `refresh()` forces a fresh request against the current query — useful
 * after the vector store has been updated server-side and you want the
 * latest hits without changing the query.
 */
export function useSimilar(storeName, query, {
    client: clientArg,
    limit = 5,
    debounce = 200,
    minLength = 1,
} = {}) {
    const client = clientArg ?? useMikserVectorClient()
    const store = client.vector(storeName)

    const results = shallowRef([])
    const loading = ref(false)
    const error   = ref(null)

    // Monotonic token — incremented on every new query attempt. The
    // response handler discards itself if the token has moved past the
    // one it captured at fire time. Prevents stale results from older
    // queries clobbering newer ones in a fast-typing burst.
    let token = 0
    let timer = null

    function readQuery() {
        const raw = typeof query === 'function'
            ? query()
            : query?.value !== undefined ? query.value : query
        return String(raw ?? '').trim()
    }

    async function fire(q, myToken) {
        loading.value = true
        try {
            const { results: hits } = await store.findSimilar(q, { limit })
            if (myToken !== token) return     // stale
            results.value = hits
            error.value = null
        } catch (err) {
            if (myToken !== token) return
            error.value = err
            results.value = []
        } finally {
            if (myToken === token) loading.value = false
        }
    }

    watch(
        readQuery,
        (q) => {
            token++
            if (timer) clearTimeout(timer)
            if (q.length < minLength) {
                results.value = []
                loading.value = false
                error.value = null
                return
            }
            const myToken = token
            if (debounce > 0) {
                timer = setTimeout(() => fire(q, myToken), debounce)
            } else {
                fire(q, myToken)
            }
        },
        { immediate: true },
    )

    if (getCurrentScope()) {
        onScopeDispose(() => {
            if (timer) clearTimeout(timer)
            token++          // any in-flight request now sees itself as stale
        })
    }

    function refresh() {
        const q = readQuery()
        if (q.length < minLength) return
        token++
        if (timer) clearTimeout(timer)
        fire(q, token)
    }

    return { results, loading, error, refresh }
}
