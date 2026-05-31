import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Public build — pre-renders every route at build time using vite-ssg.
// Reads the route list from build/generate-routes.mjs's output.
//
// dev:public serves index.html unmodified (vite dev server). For SSR
// preview during dev, use `vite-ssg preview` after a build.
export default defineConfig({
    plugins: [vue()],
    build: {
        outDir: 'dist/public',
        emptyOutDir: true,
    },
    server: { port: 5173 },
    ssgOptions: {
        // vite-ssg crawls links from the entry page by default. For a
        // mikser-driven site we want explicit control: enumerate routes
        // from the generated manifest.
        includedRoutes: async () => {
            const { default: routes } = await import('./src/generated/routes.json', { with: { type: 'json' } })
            return routes.map(r => r.path)
        },
        formatting: 'minify',
    },
})
