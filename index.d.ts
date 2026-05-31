// Type declarations for mikser-io-sdk-vue.

import type { App, Plugin, Ref, MaybeRef } from 'vue'
import type {
    EntitiesClient,
    Filter,
    ListQuery,
    LiveOptions,
} from 'mikser-io-sdk-api'
import type {
    Router,
    RouteRecordRaw,
    RouterHistory,
    RouterOptions,
} from 'vue-router'

// ---------------------------------------------------------------------------
// Plugin + injection
// ---------------------------------------------------------------------------

export interface MikserPluginOptions {
    /** The entities client returned by createClient(...).entities(name). */
    client: EntitiesClient
}

export declare function createMikserPlugin(options: MikserPluginOptions): Plugin

/**
 * Inject the configured EntitiesClient from the plugin. Useful for
 * ad-hoc calls like client.urlFor() or client.render().
 */
export declare function useMikserClient(): EntitiesClient

// ---------------------------------------------------------------------------
// Document composables
// ---------------------------------------------------------------------------

export interface UseDocumentResult<T = unknown> {
    /** The resolved document, or null while loading / when missing. */
    document: Ref<T | null>
    /** True until the initial fetch resolves. */
    loading:  Ref<boolean>
    /** Populated when an error fires through onError. */
    error:    Ref<unknown>
    /** Manually re-trigger the subscription. */
    refresh:  () => void
}

export interface UseComposableOptions {
    /** Override the injected client (rare — useful for tests / multi-client apps). */
    client?: EntitiesClient
}

/**
 * Live single-document composable. The id can be a string, a Ref, or a
 * getter — the subscription resubscribes when the source changes.
 */
export declare function useDocument<T = unknown>(
    id: MaybeRef<string | null | undefined> | (() => string | null | undefined),
    options?: UseComposableOptions,
): UseDocumentResult<T>

export interface UseDocumentsResult<T = unknown> {
    documents: Ref<T[]>
    loading:   Ref<boolean>
    error:     Ref<unknown>
    refresh:   () => void
}

/**
 * Live list composable. Accepts a ListQuery (filter + sort + fields +
 * limit + skip), a Ref, or a getter; resubscribes on changes.
 */
export declare function useDocuments<T = unknown>(
    query?: MaybeRef<ListQuery> | (() => ListQuery),
    options?: UseComposableOptions,
): UseDocumentsResult<T>

// ---------------------------------------------------------------------------
// Router integration
// ---------------------------------------------------------------------------

export interface CreateMikserRouterOptions {
    client: EntitiesClient
    /**
     * Maps a document into a Vue Router RouteRecordRaw. Receives the
     * fields requested via fields=['id', 'meta'] — narrow further with
     * a custom `fields` if you need extra metadata for routing.
     */
    mapRoute: (document: any) => RouteRecordRaw
    /**
     * Which documents become routes. Default:
     *   { 'meta.published': true, 'meta.route': { $exists: true } }
     */
    filter?: Filter
    /** Hand-coded routes (login, dashboard, etc.) — mounted before content. */
    staticRoutes?: RouteRecordRaw[]
    /** Component for the catch-all '/:pathMatch(.*)*' route. Omit to skip. */
    notFoundComponent?: RouteRecordRaw['component']
    /** Required — createWebHistory() / createMemoryHistory() / createWebHashHistory(). */
    history: RouterHistory
    /** Forwarded to createRouter() — sensitive, strict, scrollBehavior, etc. */
    routerOptions?: Omit<RouterOptions, 'history' | 'routes'>
}

/**
 * Build a Vue Router whose content routes come from mikser and stay
 * live via client.live(). Async — awaits the initial document list
 * before mounting.
 */
export declare function createMikserRouter(
    options: CreateMikserRouterOptions,
): Promise<Router>

export interface UseMikserRoutesOptions {
    /** Defaults to the injected client. */
    client?: EntitiesClient
    /**
     * Which documents become routes. Default:
     *   { 'meta.published': true, 'meta.route': { $exists: true } }
     */
    filter?: Filter
    /** Maps a document into a Vue Router RouteRecordRaw. */
    mapRoute: (document: any) => RouteRecordRaw | null | undefined
}

/**
 * Live reactive list of route records from the mikser catalog. Returns
 * a shallowRef that re-assigns whenever a matching entity is created,
 * updated, or deleted server-side. Use to compose mikser-driven routes
 * with your own routes — feed `.value` into your own createRouter()
 * call.
 *
 * For composing with an existing router instance, prefer
 * `useMikserRoutesSync` — it does the diff + addRoute/removeRoute for you.
 */
export declare function useMikserRoutes(
    options: UseMikserRoutesOptions,
): Ref<RouteRecordRaw[]>

export interface UseMikserRoutesSyncOptions {
    client?: EntitiesClient
    filter?: Filter
    /**
     * Maps a document into a Vue Router RouteRecordRaw. **Must return a
     * route with a `name`** — addRoute / removeRoute use it as the diff
     * key. Routes without a name are silently skipped.
     */
    mapRoute: (document: any) => RouteRecordRaw | null | undefined
}

/**
 * Keep an existing vue-router instance in sync with the mikser catalog
 * via addRoute / removeRoute. Right when you already have a router with
 * your own static / dynamic routes and want mikser to slot in alongside
 * them, without rebuilding the whole router.
 *
 * Returns a dispose function; also auto-disposes on the surrounding
 * effect scope's teardown.
 */
export declare function useMikserRoutesSync(
    router: Router,
    options: UseMikserRoutesSyncOptions,
): () => void

export interface GenerateMikserRoutesOptions {
    client: EntitiesClient
    mapRoute: (document: any) => RouteRecordRaw
    filter?: Filter
}

/**
 * Build-time helper. One-shot listAll() that returns an array of route
 * definitions for static-site generators (Vite SSG, Nuxt static, etc.).
 */
export declare function generateMikserRoutes(
    options: GenerateMikserRoutesOptions,
): Promise<RouteRecordRaw[]>

// ---------------------------------------------------------------------------
// href() — multilingual URL abstraction
// ---------------------------------------------------------------------------

export interface ProvideHrefIndexOptions {
    /** Defaults to the injected client. */
    client?: EntitiesClient
    /**
     * Which documents participate in the href index. Default:
     *   { 'meta.href': { $exists: true } }
     */
    filter?: Filter
    /**
     * Bucket name for documents without meta.lang. The href() resolver
     * falls back to this bucket when the requested language isn't found.
     * Default: 'default'.
     */
    defaultLang?: string
}

/** Map of logical href → { lang → resolved URL }. */
export type HrefIndex = Record<string, Record<string, string>>

/** Builds the index, provides it into the injection tree, returns the ref. */
export declare function provideHrefIndex(
    options?: ProvideHrefIndexOptions,
): Ref<HrefIndex>

export interface UseHrefResult {
    /**
     * Resolve a logical href + optional language to a real URL.
     * Returns the input unchanged when no entry matches (so broken refs
     * stay visible instead of becoming undefined).
     */
    href: (ref: string, lang?: string) => string
    /**
     * Reverse lookup — given a deployed URL, return the logical
     * reference it belongs to (or null). Used internally by
     * useAlternates(); exposed here for advanced cases.
     */
    refFor: (url: string | null | undefined) => string | null
    /** Direct access to the underlying index — for advanced cases. */
    index: Ref<HrefIndex>
}

/**
 * Inject the href index. `defaultLangRef` is the fallback when the
 * caller doesn't pass a lang — typically your i18n locale ref.
 */
export declare function useHref(
    defaultLangRef?: MaybeRef<string>,
): UseHrefResult

export interface Alternate {
    /** Language code — 'en', 'fr', 'bg', etc. */
    lang: string
    /** Deployed URL for this alternate. */
    url: string
}

export interface CurrentRoute {
    /** Language of the current route, or null if no document matched. */
    lang: string | null
    /** The URL we were given to resolve. */
    url: string
    /** The logical reference (meta.href) for the matched document. */
    ref: string
}

export interface UseAlternatesOptions {
    /**
     * The URL to find alternates for. Required.
     * Typically `() => useRoute().path` when using vue-router.
     */
    route: MaybeRef<string> | (() => string | null | undefined)
    /**
     * Optional list of languages to include in `alternates`. When
     * provided, every language in the list appears (falling back via
     * href() when a translation doesn't exist) — right for language
     * switchers. When omitted, only languages that actually have a
     * translation appear — right for hreflang tags.
     */
    languages?: MaybeRef<string[]> | (() => string[])
}

export interface UseAlternatesResult {
    /** The list of alternates, excluding the current page's own language. */
    alternates: Ref<Alternate[]>
    /** The matched current route, or null if no document corresponded to it. */
    current: Ref<CurrentRoute | null>
}

/**
 * Alternate-language URLs for a given route. Powers language
 * switchers and SEO hreflang tags. The composable doesn't depend on
 * vue-router — pass the route path as a string, ref, or getter.
 */
export declare function useAlternates(options: UseAlternatesOptions): UseAlternatesResult

// ---------------------------------------------------------------------------
// asset() — asset / image reference resolution
// ---------------------------------------------------------------------------

export interface AssetRecord {
    url:    string
    width?: number
    height?: number
    srcset?: string
    alt?:   string
    meta?:  Record<string, unknown>
}

export interface ProvideAssetIndexOptions {
    client?: EntitiesClient
    filter?: Filter
}

export type AssetIndex = Record<string, AssetRecord>

export declare function provideAssetIndex(
    options?: ProvideAssetIndexOptions,
): Ref<AssetIndex>

export interface UseAssetResult {
    /** Returns the full asset record, or null if unknown. */
    asset: (ref: string) => AssetRecord | null
    /**
     * Returns an object suitable for spreading onto an <img>:
     *   { src, width, height, srcset, alt }
     */
    image: (ref: string) => {
        src:    string
        width?: number
        height?: number
        srcset?: string
        alt?:   string
    } | null
    index: Ref<AssetIndex>
}

export declare function useAsset(): UseAssetResult
