# Example B — Hybrid SSG + Live editor

Two builds from one content source. The **public site** is statically rendered (one HTML file per route, deployed to a CDN, fully crawlable). The **editor app** is a live SPA mounted at `/admin/` — same view components, different mount and different router. The two stay in sync because both build from the same `route-mapping.js`.

This is the typical agency project shape for marketing sites, blogs, documentation, anything that needs SEO.

## When to pick this

- Marketing sites, blogs, documentation, e-commerce catalogs
- Anywhere SEO matters
- Anywhere you have non-developer editors who need a live preview
- Anywhere you ship to a CDN

## What it shows

- `generateMikserRoutes()` — build-time route enumeration → `src/generated/routes.json`
- **Shared `route-mapping.js`** — the same `views` table and `mapRoute` function used by the public build, the editor router, and the build script
- **Two Vite configs** — `vite.config.js` (public, SSG via vite-ssg) and `vite.config.editor.js` (editor, SPA)
- **Two entry points** — `index.html` (public) and `admin.html` (editor)
- **Two main.js** — public uses `ViteSSG`; editor uses `createApp` + `createMikserRouter`
- Same `useDocument` / `useDocuments` composables in both, identical view components

## Project structure

```
b-hybrid-ssg/
├── index.html                   ← public entry
├── admin.html                   ← editor entry
├── vite.config.js               ← public build (vite-ssg)
├── vite.config.editor.js        ← editor build (SPA)
├── package.json
├── build/
│   └── generate-routes.mjs      ← build-time route generator
└── src/
    ├── route-mapping.js         ← SHARED: views table + mapRoute
    ├── generated/
    │   └── routes.json          ← output of generate-routes.mjs (gitignored)
    ├── public/
    │   ├── main.js              ← ViteSSG entry
    │   ├── router.js            ← reads routes.json, rehydrates components
    │   └── App.vue
    ├── editor/
    │   ├── main.js              ← createMikserRouter (live)
    │   ├── App.vue
    │   └── EditorHome.vue       ← recently-edited overview
    └── views/                   ← SHARED views (article/product/landing/page)
        ├── ArticleView.vue
        ├── ProductView.vue
        ├── LandingView.vue
        ├── PageView.vue
        ├── ArticleIndex.vue
        ├── Home.vue
        └── NotFound.vue
```

## The shared `route-mapping.js`

This is the load-bearing file. One function (`mapRoute`) drives three different consumers:

| Consumer | When | What it does with mapRoute |
|---|---|---|
| `build/generate-routes.mjs` | Build time, before public build | Calls `generateMikserRoutes({ mapRoute })` → writes routes.json |
| `src/public/router.js` | Public runtime, post-build | Reads routes.json, rehydrates the component for each route via the views table |
| `src/editor/main.js` | Editor runtime | Passes to `createMikserRouter({ mapRoute })` for live route sync |

Change a dispatch rule (e.g. add `meta.layout: 'changelog'` → `ChangelogView`); all three consumers update on the next build/restart.

## Run it

```bash
cd examples/b-hybrid-ssg
npm install

# .env — same MIKSER_URL for both server-side and Vite
cat > .env <<EOF
MIKSER_URL=http://localhost:3001
VITE_MIKSER_URL=http://localhost:3001
EOF

# Editor (live SPA) — http://localhost:5174/admin/
npm run dev:editor

# Public build (static, pre-rendered HTML in dist/public/)
npm run build:public
npx serve dist/public
```

In production you'd deploy `dist/public/` to a CDN and the editor app to a protected URL (private subdomain, auth-walled path, or only available to authenticated users).

## What to take away

The hard part of hybrid SSG + Live isn't either build individually — both are well-understood. The hard part is keeping them in sync as the content model evolves. The answer is **the shared `route-mapping.js`** — one function, three consumers. Treat that file as the contract between the two builds; everything else is plumbing.
