<script setup>
import { useDocuments } from 'mikser-io-sdk-vue'

// A nav menu driven by content — articles published with
// meta.nav: true show up here automatically.
const { documents: navLinks } = useDocuments({
    filter: { 'meta.nav': true, 'meta.published': true },
    sort:   { 'meta.nav_order': 1 },
    fields: ['id', 'meta.title', 'meta.route'],
})
</script>

<template>
    <nav>
        <router-link to="/">Home</router-link>
        <router-link to="/articles">Articles</router-link>
        <router-link v-for="link in navLinks" :key="link.id" :to="link.meta.route">
            {{ link.meta.title }}
        </router-link>
    </nav>
</template>
