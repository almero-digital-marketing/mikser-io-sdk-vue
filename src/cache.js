// Reactive local content cache — Vue shell around sdk-api's createCache.
//
// A sync read() / documentSync() re-evaluates when an entry lands, so it
// works in Pinia getters, sync template helpers, anywhere outside a
// component's inject context — because this is a plain factory, not a
// composable. Create it once (module scope or a store) and share it.
//
// Pairs with the live href index (useHref / meta): meta() is always-fresh
// from an SSE subscription; this is load-once, expand-capable, and readable
// from non-component code. Reach for live() / meta() for changing feeds;
// reach for this for system docs, nav, settings — content read often that
// changes rarely.
//
//   const content = createReactiveCache(client.entities('public'))
//   await content.document('/system/products', { expand: ['products.*.video'] })
//   content.documentSync('/system/translation')   // sync + reactive
import { shallowRef } from 'vue'
import { createCache } from 'mikser-io-sdk-api'

export function createReactiveCache(docs) {
    const cache = createCache(docs)
    // A version tick bumped on every cache change. Reading it inside a
    // computed / Pinia getter registers the dependency, so a sync read
    // re-runs when its entry lands.
    const tick = shallowRef(0)
    cache.subscribe(() => { tick.value++ })

    function load(query, opts)  { return cache.get(query, opts) }
    function read(query)        { void tick.value; return cache.peek(query) }
    function invalidate(query)  { cache.invalidate(query) }

    // Doc-by-logical-ref convenience — the SPA's common case. `document`
    // loads (async, memoized); `documentSync` reads the loaded doc (sync,
    // reactive) — returns null until the matching load() settles.
    // A document comes with its references resolved — default expand is the
    // `$` wildcard. Pass `expand: []` to opt out, or a path list to narrow.
    const byHref = (href, expand) => ({ filter: { 'meta.href': href }, limit: 1, expand })
    function document(href, { expand = ['$'] } = {}) {
        return cache.get(byHref(href, expand)).then(env => env.items?.[0] ?? null)
    }
    function documentSync(href, { expand = ['$'] } = {}) {
        void tick.value
        return cache.peek(byHref(href, expand))?.items?.[0] ?? null
    }

    return { load, read, invalidate, document, documentSync, cache }
}
