<script setup>
import { useRoute, useRouter } from 'vue-router'
import { onMounted, ref } from 'vue'
import { useMikserClient } from 'mikser-io-sdk-vue'

// Smart 404: before showing "not found", check whether a document with
// meta.route matching the current path has just landed in the catalog
// (e.g. published seconds ago, after useMikserRoutesSync's initial
// seed but processed by the live() subscription too late to
// re-navigate). If so, register the route and re-navigate. Otherwise
// show the 404 message.
const route     = useRoute()
const router    = useRouter()
const documents = useMikserClient()
const checking  = ref(true)

onMounted(async () => {
    const { items: [document] } = await documents.list({
        filter: { 'meta.route': route.path, 'meta.published': true },
        limit:  1,
    })
    if (document) {
        const { default: PageView } = await import('./PageView.vue')
        router.addRoute({
            path:      document.meta.route,
            name:      document.id,
            component: PageView,
            props:     () => ({ entityId: document.id }),
        })
        router.replace(route.fullPath)
    } else {
        checking.value = false
    }
})
</script>

<template>
    <main class="not-found">
        <p v-if="checking">Looking…</p>
        <template v-else>
            <h1>Page not found</h1>
            <router-link to="/">Back to home</router-link>
        </template>
    </main>
</template>
