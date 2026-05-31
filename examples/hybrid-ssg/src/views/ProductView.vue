<script setup>
import { useDocument } from 'mikser-io-sdk-vue'

const props = defineProps({ entityId: String })
const { document: product } = useDocument(() => props.entityId)

function addToCart() {
    // Hand off to your cart store / API. The point of this example is
    // that the *content* shape (price, sku, stock) comes from mikser
    // while the *behaviour* (cart) is a separate concern — see
    // ADR-0001 in the main mikser-io repo.
    console.log('Add to cart:', product.value?.meta?.sku)
}
</script>

<template>
    <section v-if="product" class="product">
        <figure class="product-image">
            <img :src="product.meta?.image" :alt="product.meta?.title" />
        </figure>
        <div class="product-info">
            <h1>{{ product.meta?.title }}</h1>
            <p class="sku">SKU {{ product.meta?.sku }}</p>
            <p class="price">€{{ product.meta?.price }}</p>
            <p v-if="product.meta?.in_stock" class="stock in">In stock</p>
            <p v-else class="stock out">Out of stock</p>
            <button :disabled="!product.meta?.in_stock" @click="addToCart">
                Add to cart
            </button>
            <div class="product-description" v-html="product.content" />
        </div>
    </section>
</template>
