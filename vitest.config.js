// The composables under test call provide()/inject() and onScopeDispose(),
// which need a real component instance — not an app-level context. So they
// are mounted, and mounting needs a DOM.
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'jsdom',
        include: ['test/**/*.test.js'],
    },
})
