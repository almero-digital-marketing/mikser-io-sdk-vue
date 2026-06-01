<script setup>
import { useDocuments } from 'mikser-io-sdk-vue'

// Recently-edited documents — useful surface for an editor.
const { documents: recent } = useDocuments({
    filter: { type: 'document' },
    sort:   { stamp: -1 },
    fields: ['id', 'meta.title', 'meta.component', 'meta.route', 'stamp'],
    limit:  15,
})
</script>

<template>
    <main class="editor-home">
        <h1>Recently edited</h1>
        <ul>
            <li v-for="d in recent" :key="d.id">
                <router-link :to="d.meta.route">
                    <strong>{{ d.meta?.title }}</strong>
                    <span class="layout-badge">{{ d.meta?.layout }}</span>
                </router-link>
            </li>
        </ul>
    </main>
</template>
