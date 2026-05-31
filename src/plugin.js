// Plugin + injection — the entities client is shared app-wide via Vue's
// provide/inject. Every other composable in the SDK either takes a
// client explicitly or grabs it via useMikserClient().
import { inject } from 'vue'

export const MIKSER_CLIENT = Symbol('mikser-io.client')

/**
 * Vue plugin — provides the entities client app-wide via inject().
 *
 *   app.use(createMikserPlugin({ client: docs }))
 */
export function createMikserPlugin({ client } = {}) {
    if (!client) {
        throw new Error('createMikserPlugin: { client } is required')
    }
    return {
        install(app) {
            app.provide(MIKSER_CLIENT, client)
            // Also expose as a global property for template-only use:
            //   <a :href="$mikser.urlFor({ filter: ... })">link</a>
            app.config.globalProperties.$mikser = client
        },
    }
}

/**
 * Inject the configured entities client. Usually you don't need this —
 * useDocument / useDocuments / etc. inject it for you. Useful when you
 * want to make ad-hoc calls (urlFor, render, etc.).
 */
export function useMikserClient() {
    const client = inject(MIKSER_CLIENT, null)
    if (!client) {
        throw new Error(
            'useMikserClient: no client found. Did you install the plugin? ' +
            'app.use(createMikserPlugin({ client }))'
        )
    }
    return client
}
