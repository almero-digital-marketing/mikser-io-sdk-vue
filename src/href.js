// Multilingual href() — abstract logical references (/about) from
// deployed URLs (/en/about, /fr/a-propos). See README for the full
// pattern; this module is the implementation.
import { shallowRef, inject, provide, computed, unref, getCurrentScope, onScopeDispose } from 'vue'
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
 * Inject the href index. Returns `{ href, refFor, index }`.
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
 *
 * `refFor(url)` is the reverse — given a deployed URL, return the
 * logical reference it belongs to (or null). Powers useAlternates().
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

    function refFor(url) {
        const target = unref(url)
        if (target == null) return null
        for (const [ref, byLang] of Object.entries(index.value)) {
            if (Object.values(byLang).includes(target)) return ref
        }
        return null
    }

    return { href, refFor, index }
}

/**
 * useAlternates — alternate-language URLs for a given route. Powers
 * language switchers and SEO hreflang tags.
 *
 *   const route = useRoute()
 *   const { alternates, current } = useAlternates({ route: () => route.path })
 *   // alternates = [{ lang: 'fr', url: '/fr/a-propos' }, ...]
 *   // current    = { lang: 'en', url: '/en/about', ref: '/about' }
 *
 * `route` is the URL to find alternates for. String, ref, or getter.
 * Required — the composable doesn't depend on vue-router so it works
 * outside Vue Router (e.g. with Nuxt, with a hand-rolled router, or
 * for an arbitrary URL not tied to navigation).
 *
 * `languages` controls which alternates appear:
 *   - omitted: return only languages that actually exist for the
 *     current ref. Right shape for hreflang tags — don't advertise
 *     translations that don't exist.
 *   - provided (array, ref, or getter): return one entry per language
 *     in the list, falling back via href() resolution when a real
 *     translation doesn't exist. Right shape for language switchers —
 *     show every locale the app supports, even if a particular page
 *     hasn't been translated yet.
 *
 * The current page's own language is excluded from `alternates` (it's
 * what `current` is for). Callers that want to include it can prepend
 * `current` themselves.
 */
export function useAlternates({ route, languages } = {}) {
    if (route == null) {
        throw new Error('useAlternates: { route } is required (string, ref, or getter)')
    }
    const { href, refFor, index } = useHref()

    const current = computed(() => {
        const path = unref(typeof route === 'function' ? route() : route)
        if (path == null) return null
        const ref = refFor(path)
        if (ref == null) return null
        const entry = index.value[ref] ?? {}
        const lang = Object.entries(entry).find(([, url]) => url === path)?.[0] ?? null
        return { lang, url: path, ref }
    })

    const alternates = computed(() => {
        const c = current.value
        if (!c) return []
        const entry = index.value[c.ref] ?? {}
        const requested = unref(typeof languages === 'function' ? languages() : languages)

        if (requested && Array.isArray(requested)) {
            // Explicit list — return one entry per requested language,
            // using href()'s fallback chain when a translation is
            // missing. Skip the current page's own language.
            return requested
                .filter(lang => lang !== c.lang)
                .map(lang => ({ lang, url: href(c.ref, lang) }))
        }

        // No list — return only languages that exist in the catalog.
        // Skip 'default' (it's the bucket for un-tagged docs, not a
        // real locale) and the current page's own language.
        return Object.entries(entry)
            .filter(([lang]) => lang !== c.lang && lang !== 'default')
            .map(([lang, url]) => ({ lang, url }))
    })

    return { alternates, current }
}
