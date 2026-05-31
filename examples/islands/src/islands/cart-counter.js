// Cart counter island. Mounts onto <div data-island="cart-counter">.
// Doesn't touch mikser — it's purely client-side state (e.g. cart
// store) but illustrates that islands aren't required to be
// mikser-aware. They can do anything Vue can do.
import { createApp } from 'vue'
import CartCounter from '../components/CartCounter.vue'

const el = document.querySelector('[data-island="cart-counter"]')
if (el) {
    createApp(CartCounter).mount(el)
}
