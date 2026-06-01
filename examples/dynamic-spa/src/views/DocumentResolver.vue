<script setup>
import { useRoute } from 'vue-router'
import { useDocumentByRoute } from 'mikser-io-sdk-vue'
import ArticleView from './ArticleView.vue'
import ProductView from './ProductView.vue'
import LandingView from './LandingView.vue'
import PageView    from './PageView.vue'
import NotFound    from './NotFound.vue'

// Look up the catalog entry whose meta.route matches the current URL.
// With cache: true on the public endpoint, mikser writes each unique
// route's response to disk as a side effect — repeat visits to the
// same route are served by the reverse proxy directly. First visit
// pays one API roundtrip; warm thereafter. Effectively per-route ISR.
const route = useRoute()
const { document: doc, loading } = useDocumentByRoute(() => route.path)

// Same dispatch table as pure-spa, just keyed inline rather than from
// a separate route-mapping module — there's no other consumer here.
const views = {
    article: ArticleView,
    product: ProductView,
    landing: LandingView,
    page:    PageView,        // fallback for unknown components
}
</script>

<template>
    <p v-if="loading" class="loading">Loading…</p>
    <component
        v-else-if="doc"
        :is="views[doc.meta?.component] ?? PageView"
        :entity-id="doc.id"
    />
    <NotFound v-else />
</template>

<style scoped>
.loading { padding: 2rem; color: #888; text-align: center; }
</style>
