<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// Read cart count from localStorage; refresh on the 'storage' event so
// other tabs / other islands stay in sync. No mikser involved — this
// island is purely client state.
const count = ref(0)

function refresh() {
    try {
        const items = JSON.parse(localStorage.getItem('cart') ?? '[]')
        count.value = items.length
    } catch {
        count.value = 0
    }
}

onMounted(() => {
    refresh()
    addEventListener('storage', refresh)
})
onUnmounted(() => {
    removeEventListener('storage', refresh)
})
</script>

<template>
    <a class="cart-counter" href="/cart">
        Cart <span v-if="count" class="badge">{{ count }}</span>
    </a>
</template>
