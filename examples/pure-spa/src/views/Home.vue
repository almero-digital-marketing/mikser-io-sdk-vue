<script setup>
import { useDocuments } from 'mikser-io-sdk-vue'

// Three most recent articles — feeds the home page's "Latest" section.
const { documents: latest } = useDocuments({
    filter: { 'meta.component': 'article', 'meta.published': true },
    sort:   { 'meta.date': -1 },
    fields: ['id', 'meta.title', 'meta.date', 'meta.summary', 'meta.route'],
    limit:  3,
})
</script>

<template>
    <main class="home">
        <section class="hero">
            <h1>Welcome</h1>
            <p>Pure SPA — every view fetches live, every change shows up without refresh.</p>
        </section>
        <section class="latest">
            <h2>Latest articles</h2>
            <ul>
                <li v-for="a in latest" :key="a.id">
                    <router-link :to="a.meta.route">
                        <h3>{{ a.meta.title }}</h3>
                        <time>{{ a.meta.date }}</time>
                    </router-link>
                </li>
            </ul>
        </section>
    </main>
</template>
