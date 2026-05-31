import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Pure SPA: single entry, default Vite config. The only knob worth
// noting is that the entire mikser interaction happens at runtime —
// no build-time route generation, no manifests. Vite's job is just
// to bundle the Vue app.
export default defineConfig({
    plugins: [vue()],
    server: { port: 5173 },
})
