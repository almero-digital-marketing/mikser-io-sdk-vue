// Asset resolution — Vue-reactive shell around sdk-api's format-neutral
// asset helpers.
//
//   useAsset().assetUrl(source, preset, { ext })  — preset → derivative
//     URL by convention; pure, needs no subscription (just the client's
//     baseUrl). The common case.
//   useAsset().asset(ref)                          — managed-entity
//     metadata lookup; only resolves when provideAssetIndex() is in a
//     parent. Returns { url, meta } | null.
import { shallowRef, inject, provide, computed, getCurrentScope, onScopeDispose } from 'vue'
import { assetUrl as buildAssetUrl, createAssetIndex } from 'mikser-io-sdk-api'
import { useMikserClient, MIKSER_CLIENT } from './plugin.js'

export const ASSET_INDEX = Symbol('mikser-io.asset-index')

/**
 * Build and provide a reactive index of managed asset entities. Only
 * needed for useAsset().asset(ref) — the assetUrl() convention helper
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
 * Asset access. Returns `{ assetUrl, asset, index }`.
 *
 *   const { assetUrl } = useAsset()
 *   <video :src="assetUrl(clip, 'presentation')"
 *          :poster="assetUrl(clip, 'poster', { ext: 'jpg' })" />
 *
 * `assetUrl(source, preset, { ext })` builds the derivative URL by
 * convention, baseUrl bound from the installed client; works with no
 * provideAssetIndex. `asset(ref)` returns `{ url, meta } | null` for a
 * managed asset entity, and only resolves when provideAssetIndex() is in
 * a parent (otherwise null).
 */
export function useAsset() {
    const client = inject(MIKSER_CLIENT, null)
    const index = inject(ASSET_INDEX, null)

    function assetUrl(source, preset, options = {}) {
        return buildAssetUrl(source, preset, { baseUrl: client?.baseUrl ?? '', ...options })
    }

    function asset(ref) {
        return index ? index.value.asset(ref) : null
    }

    return { assetUrl, asset, index }
}
