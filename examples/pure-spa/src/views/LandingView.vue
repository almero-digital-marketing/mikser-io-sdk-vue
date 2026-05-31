<script setup>
import { useDocument } from 'mikser-io-sdk-vue'

const props = defineProps({ entityId: String })
const { document: page } = useDocument(() => props.entityId)
</script>

<template>
    <div v-if="page" class="landing">
        <section class="hero" :style="{ backgroundImage: `url(${page.meta?.hero})` }">
            <h1>{{ page.meta?.title }}</h1>
            <a v-if="page.meta?.cta" :href="page.meta.cta.href" class="cta-button">
                {{ page.meta.cta.label }}
            </a>
        </section>
        <section class="content" v-html="page.content" />
    </div>
</template>
