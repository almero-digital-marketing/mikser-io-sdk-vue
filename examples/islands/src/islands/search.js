// Search island. Mounts onto <div data-island="search">.
//
// Each island is its own tiny app — no shared root. They install the
// mikser plugin individually because each island carries its own
// configuration (which endpoint, which token if any).
import { createApp } from 'vue'
import { createClient } from 'mikser-io-sdk-api'
import { createMikserPlugin } from 'mikser-io-sdk-vue'
import SearchBox from '../components/SearchBox.vue'

const el = document.querySelector('[data-island="search"]')
if (el) {
    const endpoint = el.dataset.endpoint ?? 'public'
    const baseUrl  = el.dataset.baseUrl ?? '/'
    const docs = createClient({ baseUrl }).entities(endpoint)

    createApp(SearchBox)
        .use(createMikserPlugin({ client: docs }))
        .mount(el)
}
