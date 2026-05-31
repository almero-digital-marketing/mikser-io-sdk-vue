// Asset / image reference resolution — same provide/use pattern as
// href, scoped to asset entities. Useful when assets carry metadata
// the template needs (dimensions, srcset, alt) and you want to look
// them up by reference rather than re-fetching per render.
import { shallowRef, inject, provide, getCurrentScope, onScopeDispose } from 'vue'
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
    const index = shallowRef({})

    const dispose = client.live(
        filter,
        (assets) => {
            const next = {}
            for (const a of assets) {
                next[a.id] = {
                    url:    a.meta?.destination ?? a.meta?.url ?? a.id,
                    width:  a.meta?.width,
                    height: a.meta?.height,
                    srcset: a.meta?.srcset,
                    alt:    a.meta?.alt,
                    meta:   a.meta,
                }
            }
            index.value = next
        },
        { fields: ['id', 'meta'] },
    )

    if (getCurrentScope()) {
        onScopeDispose(() => dispose?.())
    }

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
        return index.value[ref] ?? null
    }

    function image(ref) {
        const a = index.value[ref]
        if (!a) return null
        return {
            src:    a.url,
            width:  a.width,
            height: a.height,
            srcset: a.srcset,
            alt:    a.alt,
        }
    }

    return { asset, image, index }
}
