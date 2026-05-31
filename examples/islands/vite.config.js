import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

// Multi-entry build — one bundle per island. Each entry point is a
// tiny IIFE that mounts a Vue component onto a specific DOM node.
// Mikser produces the HTML; these bundles are dropped in via <script>
// tags wherever the matching mount point lives.
//
// Output (dist/):
//   search.js          ← mount the SearchBox component
//   cart-counter.js    ← mount the CartCounter component
//   booking.js         ← mount the BookingForm component
//
// Drop these next to mikser's `out/` (or serve from a CDN) and the
// mikser-rendered HTML can <script> them per page.
export default defineConfig({
    plugins: [vue()],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                search:        resolve(__dirname, 'src/islands/search.js'),
                'cart-counter': resolve(__dirname, 'src/islands/cart-counter.js'),
                booking:       resolve(__dirname, 'src/islands/booking.js'),
            },
            output: {
                // Predictable filenames so the mikser-rendered HTML can
                // reference them as /islands/search.js etc.
                entryFileNames: '[name].js',
                assetFileNames: '[name][extname]',
            },
        },
    },
    server: {
        port: 5175,
        // Serve example-page.html as the dev page so you can see all
        // three islands in one place.
        open: '/public/example-page.html',
    },
})
