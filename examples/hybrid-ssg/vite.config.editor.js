import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

// Editor build — pure SPA, no SSG. Different entry HTML, different
// main.js, different build output. Same view components as the public
// build (shared via ../views/).
export default defineConfig({
    plugins: [vue()],
    build: {
        outDir: 'dist/editor',
        emptyOutDir: true,
        rollupOptions: {
            input: resolve(__dirname, 'admin.html'),
        },
    },
    server: { port: 5174 },
})
