// Asset resolution — Vue-reactive shell around sdk-api's format-neutral
// asset helpers.
//
//   useAsset().url(ref)        — join a deployed served path (meta.url or
//     meta.presets.<name>) to the client base; pure, needs no subscription.
//     The common case (ADR-0011).
//   useAsset().asset(ref)      — managed-entity metadata lookup; only
//     resolves when provideAssetIndex() is in a parent. { url, meta } | null.
import { shallowRef, inject, provide, computed, getCurrentScope, onScopeDispose } from 'vue'
import { deployedUrl, createAssetIndex } from 'mikser-io-sdk-api'
import { useMikserClient, MIKSER_CLIENT } from './plugin.js'

export { watchAssetFallbacks } from 'mikser-io-sdk-api'

export const ASSET_INDEX = Symbol('mikser-io.asset-index')

/**
 * Build and provide a reactive index of managed asset entities. Only
 * needed for useAsset().asset(ref) — the url() helper
 * needs no provide. Call once in the app root, then use useAsset()
 * anywhere.
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
    const assets = shallowRef([])

    const dispose = client.live(
        filter,
        (docs) => { assets.value = docs },
        { fields: ['id', 'meta'] },
    )

    if (getCurrentScope()) {
        onScopeDispose(() => dispose?.())
    }

    const index = computed(() => createAssetIndex(assets.value))

    provide(ASSET_INDEX, index)
    return index
}

/**
 * Asset access. Returns `{ url, asset, index }`.
 *
 *   const { url } = useAsset()
 *   <video :src="url(clip.meta.url)"
 *          :poster="url(clip.meta.presets.poster)" />
 *
 * `url(ref)` joins a deployed served path (from `meta.url` /
 * `meta.presets.<name>`, expanded via the catalog) to the client base;
 * works with no provideAssetIndex. `asset(ref)` returns `{ url, meta } |
 * null` for a managed asset entity, and only resolves when
 * provideAssetIndex() is in a parent (otherwise null).
 */
export function useAsset() {
    const client = inject(MIKSER_CLIENT, null)
    const index = inject(ASSET_INDEX, null)

    function url(ref) {
        return deployedUrl(ref, { baseUrl: client?.baseUrl ?? '' })
    }

    function asset(ref) {
        return index ? index.value.asset(ref) : null
    }

    return { url, asset, index }
}
