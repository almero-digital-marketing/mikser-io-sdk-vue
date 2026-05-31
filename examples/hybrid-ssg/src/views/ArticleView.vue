<script setup>
import { useDocument } from 'mikser-io-sdk-vue'

const props = defineProps({ entityId: String })
const { document: article, loading } = useDocument(() => props.entityId)
</script>

<template>
    <article v-if="article" class="article">
        <header>
            <h1>{{ article.meta?.title }}</h1>
            <p class="byline">
                By <strong>{{ article.meta?.author }}</strong>
                · <time>{{ article.meta?.date }}</time>
            </p>
        </header>
        <div class="article-body" v-html="article.content" />
        <footer>
            <router-link to="/articles">← All articles</router-link>
        </footer>
    </article>
    <p v-else-if="loading">Loading…</p>
    <p v-else>Not found.</p>
</template>
