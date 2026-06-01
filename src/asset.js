// Asset / image reference resolution — Vue-reactive shell around
// sdk-api's pure createAssetIndex.
import { shallowRef, inject, provide, computed, getCurrentScope, onScopeDispose } from 'vue'
import { createAssetIndex } from 'mikser-io-sdk-api'
import { useMikserClient } from './plugin.js'

export const ASSET_INDEX = Symbol('mikser-io.asset-index')

/**
 * Build and provide a reactive asset index. Same shape as the href
 * index — call once in the app root, then use `useAsset()` anywhere.
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
 * Inject the asset index. Returns `{ asset, image, index }`.
 *
 *   const { asset, image } = useAsset()
 *   <img v-bind="image('/assets/hero.jpg')" />
 *
 * `asset(ref)` returns the full record (url + dimensions + meta).
 * `image(ref)` returns `{ src, width, height, srcset, alt }` suitable
 * for spreading onto an <img>.
 *
 * Returns null for unresolved refs — components should branch on that.
 */
export function useAsset() {
    const index = inject(ASSET_INDEX, null)
    if (!index) {
        throw new Error(
            'useAsset: provideAssetIndex() must be called in a parent component first'
        )
    }

    function asset(ref) {
        return index.value.asset(ref)
    }

    function image(ref) {
        return index.value.image(ref)
    }

    return { asset, image, index }
}
