<script setup>
import { useDocuments } from 'mikser-io-sdk-vue'

// "Latest 6 articles" — a known-shape query that's still useful in
// dynamic-routes mode. Note the `fields` projection: we're not pulling
// every article's markdown body, just the routing + display fields.
// The dev-mode wide-list warning would fire if we forgot `fields:`.
const { documents: latest } = useDocuments({
    filter: { 'meta.component': 'article', 'meta.published': true },
    sort:   { 'meta.date': -1 },
    fields: ['id', 'meta.title', 'meta.date', 'meta.summary', 'meta.route'],
    limit:  6,
})
</script>

<template>
    <main class="home">
        <section class="hero">
            <h1>Welcome</h1>
            <p>
                Dynamic-routes SPA — one catch-all route, per-navigation
                lookup, cache-backed first paint. Routes scale without
                touching first paint cost.
            </p>
        </section>
        <section class="latest">
            <h2>Latest articles</h2>
            <ul>
                <li v-for="a in latest" :key="a.id">
                    <router-link :to="a.meta.route">
                        <h3>{{ a.meta.title }}</h3>
                        <time>{{ a.meta.date }}</time>
                        <p v-if="a.meta?.summary">{{ a.meta.summary }}</p>
                    </router-link>
                </li>
            </ul>
        </section>
    </main>
</template>
