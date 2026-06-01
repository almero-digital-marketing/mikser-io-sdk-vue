<script setup>
import { useDocuments } from 'mikser-io-sdk-vue'

// A nav menu driven by content — published documents marked
// `meta.nav: true` show up here automatically. The `fields` projection
// keeps the response small even on a big catalog. The dev-mode
// wide-list warning would fire if we forgot it.
const { documents: navLinks } = useDocuments({
    filter: { 'meta.nav': true, 'meta.published': true },
    sort:   { 'meta.nav_order': 1 },
    fields: ['id', 'meta.title', 'meta.route'],
})
</script>

<template>
    <nav>
        <router-link to="/">Home</router-link>
        <router-link v-for="link in navLinks" :key="link.id" :to="link.meta.route">
            {{ link.meta.title }}
        </router-link>
    </nav>
</template>
