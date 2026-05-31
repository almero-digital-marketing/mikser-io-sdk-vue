# Examples

Three complete starter projects matching the [Scenarios](../README.md#scenarios--picking-the-right-shape-for-your-project) in the main README. Each is self-contained — its own `package.json`, its own Vite config, its own structure — and each shows the *minimum* needed to demonstrate the pattern, not a production-ready template.

| Example | When to pick it |
|---|---|
| **[`a-pure-spa/`](./a-pure-spa)** | Editor / admin UIs, internal dashboards. No SEO. Fastest dev loop. |
| **[`b-hybrid-ssg/`](./b-hybrid-ssg)** | Marketing sites, blogs, documentation. SEO required. Two builds from one content source. |
| **[`c-islands/`](./c-islands)** | Content-heavy sites where mikser owns the HTML and Vue augments specific DOM nodes. |

Each example has its own README explaining what it shows, how to point it at a mikser server, and what to take away.

## Common to all three

All examples assume a running mikser server with the `api` plugin configured to expose a `public` endpoint:

```js
// mikser.config.js (on the server)
export default {
    plugins: ['documents', 'layouts', 'render-hbs', 'api'],
    api: {
        endpoints: {
            public: {
                query: e => e.type === 'document' && e.meta?.published,
                operations: ['list', 'subscribe'],
            },
        },
    },
}
```

The examples read the server URL from `VITE_MIKSER_URL` (and `MIKSER_URL` for build scripts). Set it in a `.env`:

```
VITE_MIKSER_URL=http://localhost:3001
MIKSER_URL=http://localhost:3001
```

## How to read them

Don't read them top-to-bottom. Each example is structured the same way so you can compare:

| Concern | A | B | C |
|---|---|---|---|
| Vite config | `vite.config.js` | `vite.config.js` (multi-entry) | `vite.config.js` (library mode) |
| Entry HTML | `index.html` | `index.html` + `admin.html` | one HTML per island host |
| Entry JS | `src/main.js` | `src/public/main.js`, `src/editor/main.js` | `src/islands/*.js` (one per island) |
| Router | runtime — `createMikserRouter()` | build-time `generateMikserRoutes()` + runtime `createRouter()` | none — mikser owns URLs |
| Component dispatch | shared `route-mapping.js` | shared `route-mapping.js` | n/a |
| Live updates | yes (runtime) | yes (editor only) | yes (in islands) |

The shared concepts move position; the underlying primitives (`useDocument`, `useDocuments`, `mapRoute`, `createMikserRouter`) stay the same. That's the point — once you know the SDK, picking between A / B / C is a build-tooling decision, not a different SDK.
