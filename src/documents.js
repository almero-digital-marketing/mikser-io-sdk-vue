// Document data composables — useDocument (single) and useDocuments (list).
// Both wrap client.live() in reactive refs and dispose cleanly on scope
// teardown (component unmount OR standalone effectScope.stop()).
import { ref, shallowRef, watch, unref, isRef, getCurrentScope, onScopeDispose } from 'vue'
import { useMikserClient } from './plugin.js'

/**
 * Live single-document composable. Resolves the doc by id and stays in
 * sync with changes via client.live().
 *
 * `id` accepts a string OR a Ref OR a getter — when it changes, the
 * subscription resubscribes against the new id automatically.
 *
 *   const { document, loading, error, refresh } = useDocument(() => props.entityId)
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

    if (getCurrentScope()) {
        onScopeDispose(() => { dispose?.(); dispose = null })
    }

    function refresh() {
        const currentQuery = unref(typeof query === 'function' ? query() : query)
        start(currentQuery)
    }

    return { documents, loading, error, refresh }
}
