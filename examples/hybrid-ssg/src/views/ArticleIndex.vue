<script setup>
import { useDocuments } from 'mikser-io-sdk-vue'

const { documents: articles, loading } = useDocuments({
    filter: { 'meta.layout': 'article', 'meta.published': true },
    sort:   { 'meta.date': -1 },
    fields: ['id', 'meta.title', 'meta.date', 'meta.author', 'meta.summary', 'meta.route'],
    limit:  20,
})
</script>

<template>
    <main class="article-index">
        <h1>Articles</h1>
        <p v-if="loading && !articles.length">Loading…</p>
        <ul v-else>
            <li v-for="a in articles" :key="a.id">
                <router-link :to="a.meta.route">
                    <h2>{{ a.meta.title }}</h2>
                    <p class="byline">{{ a.meta.author }} · {{ a.meta.date }}</p>
                    <p>{{ a.meta.summary }}</p>
                </router-link>
            </li>
        </ul>
    </main>
</template>
