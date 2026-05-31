# Pure SPA

The simplest setup. The entire app fetches content at runtime and stays live as content changes. No build-time route generation. No two-entry-point dance. Just Vue + the SDK.

## When to pick this

- Editor or admin UIs
- Internal dashboards
- Preview environments
- Any app where SEO doesn't matter and you want the fastest dev loop

## What it shows

- `createMikserRouter()` — async factory that fetches the initial document list and keeps the route table live via `client.live()`
- **Component dispatch by `meta.layout`** in `src/route-mapping.js`
- Three structurally different content views — `ArticleView`, `ProductView`, `LandingView` — plus a `PageView` fallback
- `useDocuments` powering two collection contexts — the navigation menu and the article index
- `useDocument` powering each content view
- A **smart 404** that checks the catalog before giving up — handles documents that publish between page loads

## Project structure

```
pure-spa/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.js                ← createApp + createMikserRouter + mount
    ├── App.vue
    ├── route-mapping.js       ← the views table + mapRoute callback (one source of truth)
    ├── components/
    │   └── Nav.vue            ← uses useDocuments to render a content-driven menu
    └── views/
        ├── Home.vue           ← uses useDocuments for "latest articles"
        ├── ArticleIndex.vue   ← collection listing (static route)
        ├── ArticleView.vue    ← layout: article
        ├── ProductView.vue    ← layout: product
        ├── LandingView.vue    ← layout: landing
        ├── PageView.vue       ← fallback for unknown layouts
        └── NotFound.vue       ← smart 404 — checks catalog before giving up
```

## Run it

This example consumes the catalog from the [shared `mikser-content` server](../mikser-content). Start that first if you haven't already:

```bash
cd examples/mikser-content && npm install && npm run dev
# → mikser listening on http://localhost:3001
```

Then in a separate terminal:

```bash
cd examples/pure-spa
npm install
echo "VITE_MIKSER_URL=http://localhost:3001" > .env
npm run dev
```

Open <http://localhost:5173>. Edit a document in your mikser working folder; the matching view re-renders without a refresh.

## What to take away

The router is *one* call. The component dispatch is *one* table. The data primitive is *one* composable used by every view. The mental model is the same whether the app has 5 views or 50.

If your project graduates from "all live, all the time" to "static deploy with editor previews," you don't rewrite — you reuse `route-mapping.js` (see [`../hybrid-ssg`](../hybrid-ssg)).
