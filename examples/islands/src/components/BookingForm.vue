<script setup>
import { ref } from 'vue'
import { useDocuments } from 'mikser-io-sdk-vue'

const props = defineProps({ submitUrl: String })

// Read available slots from mikser. Each one is a document with
// meta.layout: 'slot', meta.starts_at, meta.duration_minutes,
// meta.available: true.
const { documents: slots } = useDocuments({
    filter: { 'meta.layout': 'slot', 'meta.available': true },
    sort:   { 'meta.starts_at': 1 },
    fields: ['id', 'meta.starts_at', 'meta.duration_minutes'],
    limit:  50,
})

const selectedSlot = ref(null)
const name = ref('')
const email = ref('')
const submitting = ref(false)
const submitted = ref(false)
const error = ref(null)

async function submit() {
    if (!selectedSlot.value) return
    submitting.value = true
    error.value = null
    try {
        const res = await fetch(props.submitUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                slot_id: selectedSlot.value,
                name: name.value,
                email: email.value,
            }),
        })
        if (!res.ok) throw new Error(`Submit failed: ${res.status}`)
        submitted.value = true
    } catch (err) {
        error.value = err.message
    } finally {
        submitting.value = false
    }
}
</script>

<template>
    <form v-if="!submitted" class="booking-form" @submit.prevent="submit">
        <fieldset>
            <legend>Pick a time</legend>
            <label v-for="s in slots" :key="s.id">
                <input type="radio" :value="s.id" v-model="selectedSlot" />
                {{ s.meta.starts_at }} · {{ s.meta.duration_minutes }} min
            </label>
        </fieldset>
        <label>Name <input v-model="name" required /></label>
        <label>Email <input v-model="email" type="email" required /></label>
        <p v-if="error" class="error">{{ error }}</p>
        <button :disabled="submitting || !selectedSlot">
            {{ submitting ? 'Submitting…' : 'Confirm' }}
        </button>
    </form>
    <p v-else class="success">Thanks — we'll be in touch.</p>
</template>
