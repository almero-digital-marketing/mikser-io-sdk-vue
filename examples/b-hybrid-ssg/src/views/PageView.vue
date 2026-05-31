<script setup>
import { useDocument } from 'mikser-io-sdk-vue'

// Fallback view for documents whose meta.layout doesn't match any of
// the specific views (article / product / landing). Just renders the
// title and body — sufficient for plain content pages.
const props = defineProps({ entityId: String })
const { document } = useDocument(() => props.entityId)
</script>

<template>
    <main v-if="document" class="page">
        <h1>{{ document.meta?.title }}</h1>
        <div v-html="document.content" />
    </main>
</template>
