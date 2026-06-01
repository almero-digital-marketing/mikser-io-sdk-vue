import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Pure SPA: single entry, mostly default Vite config. The entire
// mikser interaction happens at runtime — no build-time route
// generation, no manifests.
//
// build.target = 'es2022' is required because src/main.js uses
// top-level `await seeded` to delay createApp().mount() until the
// initial catalog list has landed. Vite 5's default `'modules'`
// target is es2020 + browser baselines without TLA, so esbuild fails
// the production build. es2022 covers it; supported by every
// evergreen browser (Chrome 89+, Firefox 89+, Safari 15+, Edge 89+).
export default defineConfig({
    plugins: [vue()],
    build: { target: 'es2022' },
    server: { port: 5173 },
})
