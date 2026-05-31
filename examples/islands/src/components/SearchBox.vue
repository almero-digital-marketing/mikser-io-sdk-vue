<script setup>
import { ref, computed } from 'vue'
import { useDocuments } from 'mikser-io-sdk-vue'

const q = ref('')

// Sift filter built reactively from the input. The empty-string case
// uses an id that can't match anything, so the result set is empty
// until the user types — saves an unnecessary live subscription on
// the entire catalog.
const query = computed(() => ({
    filter: q.value
        ? { 'meta.title': { $regex: q.value, $options: 'i' }, 'meta.published': true }
        : { id: '__empty__' },
    fields: ['id', 'meta.title', 'meta.summary', 'meta.route'],
    limit:  10,
}))
const { documents: results, loading } = useDocuments(query)
</script>

<template>
    <div class="search-box">
        <input v-model="q" placeholder="Search…" autofocus />
        <p v-if="loading && q">Searching…</p>
        <ul v-if="results.length">
            <li v-for="r in results" :key="r.id">
                <a :href="r.meta.route">
                    <strong>{{ r.meta.title }}</strong>
                    <p>{{ r.meta.summary }}</p>
                </a>
            </li>
        </ul>
        <p v-else-if="q && !loading">No results.</p>
    </div>
</template>
