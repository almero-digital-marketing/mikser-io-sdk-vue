// Connection-status composable.
//
// `useMikserStatus()` answers the simplest possible question about a mikser
// backend: is it reachable from this browser right now? It returns a Ref
// that starts at 'connecting', moves to 'ready' on the first successful
// list call, and moves to 'unreachable' on either a request failure or a
// deadline timeout.
//
// The point is to give the consumer something to render with — a loading
// state, a "can't reach the server" message, anything other than a
// silent forever-pending screen. Without this, the natural pattern of
// `await seeded`-before-mount turns any backend outage into an empty
// page with no error surface.
//
// Implementation notes:
//   - Probe is `client.list({ limit: 1 })` — a single round trip, cheap,
//     uses the same client + baseUrl already configured.
//   - Deadline races the probe. Whichever resolves first wins. The
//     deadline catches network-hang cases where fetch never resolves
//     (e.g. unroutable host, browser policy block).
//   - Once the status is 'ready' or 'unreachable', it does not flip back
//     — this is a one-shot connection-check, not a heartbeat. Consumers
//     that need a live health signal can build it on top of useDocuments
//     and watch its `error` ref instead.

import { ref, onMounted, onUnmounted } from 'vue'
import { useMikserClient } from './plugin.js'

export function useMikserStatus({ client: clientArg, timeoutMs = 5000 } = {}) {
    const client = clientArg ?? useMikserClient()
    const status = ref('connecting')

    let timeoutId = null
    let unmounted = false

    onMounted(() => {
        client.list({ limit: 1 }).then(
            () => { if (!unmounted && status.value === 'connecting') status.value = 'ready' },
            () => { if (!unmounted && status.value === 'connecting') status.value = 'unreachable' },
        )
        timeoutId = setTimeout(() => {
            if (!unmounted && status.value === 'connecting') status.value = 'unreachable'
        }, timeoutMs)
    })

    onUnmounted(() => {
        unmounted = true
        if (timeoutId) clearTimeout(timeoutId)
    })

    return status
}
