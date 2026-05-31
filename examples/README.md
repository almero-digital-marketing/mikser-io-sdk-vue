# Examples

Three complete Vue starter projects plus one shared mikser content set that feeds them.

| Folder | Role |
|---|---|
| **[`mikser-content/`](./mikser-content)** | **The shared mikser server.** Run this first — it provides the catalog that the three Vue apps consume. Pages, articles, products, a landing page, booking slots, and a pair of Bulgarian translations to demo the multilingual `useHref()` pattern. |
| **[`pure-spa/`](./pure-spa)** | Editor / admin UIs, internal dashboards. No SEO. Fastest dev loop. |
| **[`hybrid-ssg/`](./hybrid-ssg)** | Marketing sites, blogs, documentation. SEO required. Two builds from one content source. |
| **[`islands/`](./islands)** | Content-heavy sites where mikser owns the HTML and Vue augments specific DOM nodes. |

The three Vue apps are self-contained — their own `package.json`, their own Vite config, their own structure — and each shows the *minimum* needed to demonstrate the pattern, not a production-ready template. Each has its own README explaining what it shows and what to take away.

## Run order

```bash
# Terminal 1 — start the content server (--server --watch enabled)
cd examples/mikser-content && npm install && npm run dev
# → mikser listening on http://localhost:3001

# Terminal 2 — any of the three Vue apps
cd examples/pure-spa && npm install && npm run dev
# → http://localhost:5173

# Terminal 3 — etc.
cd examples/hybrid-ssg && npm install && npm run dev:editor
cd examples/islands     && npm install && npm run dev
```

All four examples share the same content. Edit a `.md` file under `mikser-content/documents/` and every Vue app reacts in place — no refresh.

## Common to all three Vue apps

Each Vue example reads the server URL from `VITE_MIKSER_URL` (and `MIKSER_URL` for build scripts). The shared content server defaults to `:3001`, so a single `.env` per Vue example does the wiring:

```
VITE_MIKSER_URL=http://localhost:3001
MIKSER_URL=http://localhost:3001
```

The `mikser-content/` project sets up the `public` api endpoint with `list` and `subscribe` operations — exactly what the Vue composables consume. See its [README](./mikser-content) for the full `mikser.config.js` and the front-matter conventions used across the catalog.

## How to read them

Don't read them top-to-bottom. Each example is structured the same way so you can compare:

| Concern | `pure-spa` | `hybrid-ssg` | `islands` |
|---|---|---|---|
| Vite config | `vite.config.js` | `vite.config.js` (multi-entry) | `vite.config.js` (library mode) |
| Entry HTML | `index.html` | `index.html` + `admin.html` | one HTML per island host |
| Entry JS | `src/main.js` | `src/public/main.js`, `src/editor/main.js` | `src/islands/*.js` (one per island) |
| Router | runtime — `createRouter()` + `useMikserRoutes` | build-time `generateMikserRoutes()` + runtime `createRouter()` + `useMikserRoutes` (editor) | none — mikser owns URLs |
| Component dispatch | shared `route-mapping.js` | shared `route-mapping.js` | n/a |
| Live updates | yes (runtime) | yes (editor only) | yes (in islands) |

The shared concepts move position; the underlying primitives (`useDocument`, `useDocuments`, `mapRoute`, `useMikserRoutes`) stay the same. That's the point — picking between the three is a build-tooling decision, not a different SDK.
