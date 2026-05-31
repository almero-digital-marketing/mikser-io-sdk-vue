import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

// Editor build — pure SPA, no SSG. Different entry HTML, different
// main.js, different build output. Same view components as the public
// build (shared via ../views/).
//
// build.target = 'es2022' is required because src/editor/main.js uses
// top-level `await seeded` to delay createApp().mount() until the
// initial catalog list has landed. Vite 5's default `'modules'` target
// is es2020 + browser baselines without TLA, so esbuild fails the
// production build. es2022 covers it; supported by every evergreen
// browser (Chrome 89+, Firefox 89+, Safari 15+, Edge 89+).
export default defineConfig({
    plugins: [vue()],
    build: {
        target: 'es2022',
        outDir: 'dist/editor',
        emptyOutDir: true,
        rollupOptions: {
            input: resolve(__dirname, 'admin.html'),
        },
    },
    server: { port: 5174 },
})
