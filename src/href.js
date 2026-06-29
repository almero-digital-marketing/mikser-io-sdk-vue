// Multilingual href() — abstract logical references (/about) from
// deployed URLs (/en/about, /fr/a-propos). See README for the full
// pattern; this module is the Vue-reactive shell around sdk-api's
// pure createHrefIndex.
import { shallowRef, inject, provide, computed, unref, getCurrentScope, onScopeDispose } from 'vue'
import { createHrefIndex } from 'mikser-io-sdk-api'
import { useMikserClient } from './plugin.js'

export const HREF_INDEX = Symbol('mikser-io.href-index')

/**
 * Build and provide a reactive href index from the catalog. Call once
 * in the app root (or a top-level layout component).
 *
 *   <script setup>
 *   import { useMikserClient, provideHrefIndex } from 'mikser-io-sdk-vue'
 *   provideHrefIndex({ client: useMikserClient() })
 *   </script>
 *
 * Front-matter convention:
 *   meta.href:  '/about'           (logical reference)
 *   meta.lang:  'en'               (which language this document represents)
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
    const documents = shallowRef([])

    const dispose = client.live(
        filter,
        (docs) => { documents.value = docs },
        { fields: ['id', 'meta'] },
    )

    if (getCurrentScope()) {
        onScopeDispose(() => dispose?.())
    }

    const index = computed(() => createHrefIndex(documents.value, { defaultLang }))

    provide(HREF_INDEX, index)
    return index
}

/**
 * Inject the href index. Returns `{ href, refFor, doc, meta, index }`.
 *
 *   const { href, meta } = useHref(localeRef)
 *   <router-link :to="href('/about')">About</router-link>      // ref → URL
 *   <a :href="href('/about', 'fr')">Voir en français</a>
 *   <ul><li v-for="p in meta('/menu').products">{{ p.name }}</li></ul>  // ref → content
 *
 * `href`/`refFor` resolve URLs; `doc`/`meta` resolve the document a
 * logical reference points at — the content companion. All four are
 * reactive: the underlying index is a live subscription, so a `meta(ref)`
 * read in a template re-evaluates when that document changes.
 *
 * `defaultLangRef` can be a string, ref, computed, or omitted. When the
 * caller doesn't pass a lang, this is the fallback.
 */
export function useHref(defaultLangRef) {
    const index = inject(HREF_INDEX, null)
    if (!index) {
        throw new Error(
            'useHref: provideHrefIndex() must be called in a parent component first'
        )
    }

    function href(ref, lang) {
        return index.value.href(ref, unref(lang) ?? unref(defaultLangRef))
    }

    function refFor(url) {
        return index.value.refFor(unref(url))
    }

    function doc(ref, lang) {
        return index.value.docFor(ref, unref(lang) ?? unref(defaultLangRef))
    }

    function meta(ref, lang) {
        return index.value.metaFor(ref, unref(lang) ?? unref(defaultLangRef))
    }

    return { href, refFor, doc, meta, index }
}

/**
 * useAlternates — alternate-language URLs for a given route. Powers
 * language switchers and SEO hreflang tags.
 *
 *   const route = useRoute()
 *   const { alternates, current } = useAlternates({ route: () => route.path })
 *
 * `route` accepts a string, ref, or getter.
 * `languages` controls which alternates appear:
 *   - omitted: only languages that actually exist for the current ref
 *   - provided (array, ref, or getter): one entry per language in the list
 */
export function useAlternates({ route, languages } = {}) {
    if (route == null) {
        throw new Error('useAlternates: { route } is required (string, ref, or getter)')
    }
    const index = inject(HREF_INDEX, null)
    if (!index) {
        throw new Error(
            'useAlternates: provideHrefIndex() must be called in a parent component first'
        )
    }

    const result = computed(() => {
        const path = unref(typeof route === 'function' ? route() : route)
        const langs = unref(typeof languages === 'function' ? languages() : languages)
        return index.value.alternates({ route: path, languages: langs })
    })

    const current = computed(() => result.value.current)
    const alternates = computed(() => result.value.alternates)

    return { alternates, current }
}
