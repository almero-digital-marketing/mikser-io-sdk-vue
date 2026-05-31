// Multilingual href() — abstract logical references (/about) from
// deployed URLs (/en/about, /fr/a-propos). See README for the full
// pattern; this module is the implementation.
import { shallowRef, inject, provide, unref, getCurrentScope, onScopeDispose } from 'vue'
import { useMikserClient } from './plugin.js'

export const HREF_INDEX = Symbol('mikser-io.href-index')

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
