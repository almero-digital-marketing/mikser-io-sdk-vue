# mikser-io-sdk-vue

Vue 3 composables and router integration for a [mikser-io](https://github.com/almero-digital-marketing/mikser-io) server. Built on top of [`mikser-io-sdk-api`](https://github.com/almero-digital-marketing/mikser-io-sdk-api) — same patterns (`live()`, `list()`, `entities` endpoints, the live-updates contract), wrapped as idiomatic Vue 3.

Zero own dependencies. Vue 3 + Vue Router 4 (optional) + `mikser-io-sdk-api` 2.x as peer deps.

## Install

```bash
npm install mikser-io-sdk-vue mikser-io-sdk-api vue vue-router
```

`vue-router` is an optional peer — install only if you use `createMikserRouter` or `generateMikserRoutes`.

## Quick start

**main.js** — the `mapRoute` callback dispatches each document to the view that matches its `meta.layout`. Different content types ship through different views — an article isn't a product isn't a landing page. The dispatch is the central job of `mapRoute`; each view is its own component with its own concerns.

```js
// main.js
import { createApp } from 'vue'
import { createWebHistory } from 'vue-router'
import { createClient } from 'mikser-io-sdk-api'
import { createMikserPlugin, createMikserRouter } from 'mikser-io-sdk-vue'
import App from './App.vue'

const documents = createClient({ baseUrl: import.meta.env.VITE_MIKSER_URL })
    .entities('public')

// One Vue view per content layout. Each lazy-imports so it ships in
// its own chunk — articles ≠ products ≠ landing pages, code-wise.
const views = {
    article: () => import('./views/ArticleView.vue'),
    product: () => import('./views/ProductView.vue'),
    landing: () => import('./views/LandingView.vue'),
    page:    () => import('./views/PageView.vue'),   // fallback
}

const router = await createMikserRouter({
    client: documents,
    staticRoutes: [
        // Hand-coded routes — pages that aren't a single document
        { path: '/articles', component: () => import('./views/ArticleIndex.vue') },
    ],
    mapRoute: document => ({
        path:      document.meta.route,
        name:      document.id,
        component: views[document.meta.layout] ?? views.page,  // dispatch
        props:     route => ({ entityId: document.id, params: route.params }),
        meta:      { layout: document.meta?.layout, title: document.meta?.title },
    }),
    notFoundComponent: () => import('./views/NotFound.vue'),
    history: createWebHistory(),
})

createApp(App)
    .use(createMikserPlugin({ client: documents }))
    .use(router)
    .mount('#app')
```

### What `entityId` is

`entityId` is the mikser entity id — every document, file, and asset in the catalog has one. For documents it's the **source file path** under the working folder, e.g. `/documents/en/articles/welcome.md`. It's stable across content edits (only a rename changes it) and globally unique within a mikser instance.

The flow through the Quick Start above:

```
mapRoute receives a document   → its document.id is '/documents/en/articles/welcome.md'
       passes document.id as prop → ArticleView gets <ArticleView :entity-id="…welcome.md" />
       useDocument(entityId)      → opens a live subscription for { id: '…welcome.md' }
       SDK filters by id          → server returns just that one document
       editor edits the file      → SSE event flows back → component re-renders
```

The `entityId` prop name follows mikser's vocabulary — documents, files, assets are all *entities*, and `entityId` is what the catalog calls their identifier. The SDK doesn't reserve the name; you can call the prop anything, but staying with `entityId` makes a Vue codebase recognisable to anyone who already knows mikser's terms.

Documents declare their layout in front-matter — the router uses it to pick the view.

```yaml
# documents/en/articles/welcome.md
---
layout: article            # ← drives the dispatch to ArticleView.vue
title:  Welcome
author: Alice Park
date:   2026-05-01
route:  /en/articles/welcome
published: true
---

# documents/en/products/desk-lamp.md
---
layout: product            # ← drives the dispatch to ProductView.vue
title:  Desk Lamp
price:  149
image:  /assets/desk-lamp.jpg
sku:    LMP-001
route:  /en/products/desk-lamp
in_stock: true
---

# documents/en/campaigns/spring-sale.md
---
layout: landing            # ← drives the dispatch to LandingView.vue
title:  Spring Sale
hero:   /assets/spring-hero.jpg
cta:    { label: 'Shop now', href: '/products' }
route:  /en/campaigns/spring-sale
---
```

Three documents, three different layouts → three structurally different views. None of them share template code; they all share the same data primitive (`useDocument`).

**ArticleView.vue** — article shape. Headline, byline, date, body.

```vue
<!-- views/ArticleView.vue -->
<script setup>
import { useDocument } from 'mikser-io-sdk-vue'

const props = defineProps({ entityId: String })
const { document: article, loading } = useDocument(() => props.entityId)
</script>

<template>
    <article v-if="article" class="article">
        <header>
            <h1>{{ article.meta?.title }}</h1>
            <p class="byline">
                By <strong>{{ article.meta?.author }}</strong>
                · <time>{{ article.meta?.date }}</time>
            </p>
        </header>
        <div class="article-body" v-html="article.content" />
        <footer>
            <router-link to="/articles">← All articles</router-link>
        </footer>
    </article>
    <p v-else-if="loading">Loading…</p>
</template>
```

**ProductView.vue** — product shape. Image gallery, price, stock state, add-to-cart, description. Nothing in common with an article visually.

```vue
<!-- views/ProductView.vue -->
<script setup>
import { useDocument } from 'mikser-io-sdk-vue'

const props = defineProps({ entityId: String })
const { document: product } = useDocument(() => props.entityId)

function addToCart() { /* hand off to the cart store */ }
</script>

<template>
    <section v-if="product" class="product">
        <figure class="product-image">
            <img :src="product.meta?.image" :alt="product.meta?.title" />
        </figure>
        <div class="product-info">
            <h1>{{ product.meta?.title }}</h1>
            <p class="sku">SKU {{ product.meta?.sku }}</p>
            <p class="price">€{{ product.meta?.price }}</p>
            <p v-if="product.meta?.in_stock" class="stock in">In stock</p>
            <p v-else class="stock out">Out of stock</p>
            <button :disabled="!product.meta?.in_stock" @click="addToCart">
                Add to cart
            </button>
            <div class="product-description" v-html="product.content" />
        </div>
    </section>
</template>
```

**LandingView.vue** — landing-page shape. Full-bleed hero, CTA, body sections. Again, nothing in common with the other two structurally.

```vue
<!-- views/LandingView.vue -->
<script setup>
import { useDocument } from 'mikser-io-sdk-vue'

const props = defineProps({ entityId: String })
const { document: page } = useDocument(() => props.entityId)
</script>

<template>
    <div v-if="page" class="landing">
        <section class="hero" :style="{ backgroundImage: `url(${page.meta?.hero})` }">
            <h1>{{ page.meta?.title }}</h1>
            <a v-if="page.meta?.cta" :href="page.meta.cta.href" class="cta-button">
                {{ page.meta.cta.label }}
            </a>
        </section>
        <section class="content" v-html="page.content" />
    </div>
</template>
```

**ArticleIndex.vue** — a collection listing using `useDocuments`. Different shape entirely (a list, not a single document); same live-update contract underneath.

```vue
<!-- views/ArticleIndex.vue -->
<script setup>
import { useDocuments } from 'mikser-io-sdk-vue'

const { documents: articles } = useDocuments({
    filter: { 'meta.layout': 'article', 'meta.published': true },
    sort:   { 'meta.date': -1 },
    fields: ['id', 'meta.title', 'meta.date', 'meta.author', 'meta.summary', 'meta.route'],
    limit:  20,
})
</script>

<template>
    <main>
        <h1>Articles</h1>
        <ul class="article-list">
            <li v-for="a in articles" :key="a.id">
                <router-link :to="a.meta.route">
                    <h2>{{ a.meta.title }}</h2>
                    <p class="byline">{{ a.meta.author }} · {{ a.meta.date }}</p>
                    <p>{{ a.meta.summary }}</p>
                </router-link>
            </li>
        </ul>
    </main>
</template>
```

The five compose under live updates:

- Editor publishes a new article in Decap → `ArticleIndex` receives the `create` event and the new card appears at the top of the list, no refresh.
- Click it → router dispatches via `meta.layout: 'article'` → `ArticleView` mounts → its `useDocument` subscription opens → editor edits the body → the article re-renders in place.
- Browse to `/en/products/desk-lamp` → router dispatches via `meta.layout: 'product'` → `ProductView` mounts with image, price, CTA — visibly nothing like an article.
- Editor toggles `in_stock: false` in the front-matter → `ProductView` re-renders with the button disabled and the stock label flipped. Same composable. Different shape. Same live update.

**`useDocument` is the data primitive** — every content view in the app uses it. The view's job is just to render a particular shape on top of that data. The router decides which shape via `meta.layout`. The dispatch is what makes this scale to dozens of content types without growing one giant `DocumentPage` component.

That's the whole story. Everything below is detail.

## Scenarios — picking the right shape for your project

Three common shapes. Each makes a different trade between SEO, build complexity, and how much Vue does. Pick before you start; mixing them mid-project is painful.

> ### 📦 Runnable starter projects
>
> Each scenario ships as a complete starter under [`examples/`](./examples) — Vite config, `package.json`, full source tree, its own README explaining how to run it. Clone and modify rather than translate the snippets below into project structure.
>
> | Folder | What's in it |
> |---|---|
> | **[`examples/mikser-content`](./examples/mikser-content)** | **The shared content server** — a standalone mikser project that supplies the catalog to the three Vue apps below. Start it first. |
> | **[`examples/pure-spa`](./examples/pure-spa)** (scenario A) | Vite + Vue + `createMikserRouter` |
> | **[`examples/hybrid-ssg`](./examples/hybrid-ssg)** (scenario B) | Two Vite configs (public + editor), shared `route-mapping.js` |
> | **[`examples/islands`](./examples/islands)** (scenario C) | Multi-entry Vite build, three Vue islands mounting onto mikser-rendered HTML |

### A) Pure SPA — runtime everything, live everywhere

**When:** Editor UIs, admin dashboards, internal apps. SEO doesn't matter. You want the fastest dev loop and the lowest build complexity.

**How it works:** No build-time route enumeration. The app fetches the route list at boot, mounts the router, and stays subscribed to changes. Editing a document → SSE event → router updates → UI updates. No rebuild ever.

```js
// main.js
import { createApp } from 'vue'
import { createWebHistory } from 'vue-router'
import { createClient } from 'mikser-io-sdk-api'
import { createMikserPlugin, createMikserRouter } from 'mikser-io-sdk-vue'
import App from './App.vue'

const documents = createClient({ baseUrl: import.meta.env.VITE_MIKSER_URL })
    .entities('public')

// Async — the app waits for the initial document list.
const router = await createMikserRouter({
    client:   documents,
    mapRoute: document => ({
        path:      document.meta.route,
        name:      document.id,
        component: () => import('./views/DocumentPage.vue'),
        props:     route => ({ entityId: document.id, params: route.params }),
        meta:      { layout: document.meta?.layout },
    }),
    history:           createWebHistory(),
    notFoundComponent: () => import('./views/NotFound.vue'),
})

createApp(App)
    .use(createMikserPlugin({ client: documents }))
    .use(router)
    .mount('#app')
```

**Trade-offs:** Fastest to set up. Worst for SEO (the public-facing HTML is empty until JS loads). Initial boot pays a `list()` round trip (~100-500ms for typical sites).

> **📦 Full starter project:** **[`examples/pure-spa`](./examples/pure-spa)** — clone, `npm install`, set `VITE_MIKSER_URL`, `npm run dev`.

---

### B) Hybrid — SSG for public, SPA-with-live for editor

**When:** Marketing sites, blogs, documentation, any content site that needs SEO. The typical agency project.

**The idea:** Two builds from the same content. The public deploy is pre-rendered HTML (one file per route, optimised for crawlers + CDN). The editor / admin app is the SPA from scenario A, talking to the same mikser server. Both share the same `mapRoute` function, so they agree on what a route is.

**Build script** — runs in CI before the production build:

```js
// build/generate-routes.mjs
import { writeFile } from 'node:fs/promises'
import { createClient } from 'mikser-io-sdk-api'
import { generateMikserRoutes } from 'mikser-io-sdk-vue'
import { mapRoute } from '../src/route-mapping.js'   // shared

const documents = createClient({ baseUrl: process.env.MIKSER_URL }).entities('public')
const routes = await generateMikserRoutes({ client: documents, mapRoute })

await writeFile('./src/generated/routes.json',
    JSON.stringify(routes.map(r => ({ ...r, component: undefined })), null, 2))
//  ^ strip the component (it's a function — not JSON-serializable). The
//    runtime router rehydrates it via mapRoute at boot.
```

**Production router** — reads the manifest, no `list()` call needed:

```js
// src/router.js (production build)
import { createRouter, createWebHistory } from 'vue-router'
import generatedRoutes from './generated/routes.json'
import DocumentPage from './views/DocumentPage.vue'

export const router = createRouter({
    history: createWebHistory(),
    routes: [
        ...staticRoutes,
        ...generatedRoutes.map(r => ({ ...r, component: DocumentPage })),
        { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFound },
    ],
})
```

Then run **Vite SSG** or **vite-plugin-ssr** to pre-render each route's HTML. Each route's page calls `useDocument()` during SSR to fetch the content — produces a fully-rendered HTML file.

**Editor app** — separate entry point, uses scenario A (`createMikserRouter` + live composables). Mounted under `/admin/*` or on a different domain. Stays live always.

```
project/
  src/
    public/main.js      ← SSG entry, uses generated routes
    editor/main.js      ← SPA entry, uses createMikserRouter (live)
  build/
    generate-routes.mjs ← run before vite build
```

**Trade-offs:** Two entry points, two build steps, slightly more wiring. In exchange: SEO-correct, CDN-friendly public deploy + live editor preview from the same content source.

> **📦 Full starter project:** **[`examples/hybrid-ssg`](./examples/hybrid-ssg)** — the load-bearing file is `src/route-mapping.js`, shared between three consumers (build script, public router, editor router).

---

### C) Mikser-rendered HTML + Vue islands

**When:** Content-heavy sites where most pages are pure content (mikser renders them perfectly) but a few features need interactivity (search box, contact form, filters, live counts).

**The idea:** Mikser is responsible for the HTML. Vue is just an enhancement layer that mounts onto specific DOM nodes the server-rendered HTML emits. No vue-router involved — the URLs are real URLs served as static files.

**Public site:** `mikser build` produces `out/`. Deploy `out/` as static. The HTML includes a mount point for the Vue island:

```html
<!-- documents/en/search.md → rendered via layouts/page.html.hbs -->
<article>
    <h1>{{meta.title}}</h1>
    <div id="search-island" data-endpoint="public"></div>
</article>
```

**Vue island bundle** — separate Vite build, mounted on demand:

```js
// src/islands/search.js
import { createApp } from 'vue'
import { createClient } from 'mikser-io-sdk-api'
import { createMikserPlugin } from 'mikser-io-sdk-vue'
import SearchBox from './SearchBox.vue'

const el = document.getElementById('search-island')
if (el) {
    const documents = createClient({ baseUrl: '/' })   // same-origin
        .entities(el.dataset.endpoint)
    createApp(SearchBox)
        .use(createMikserPlugin({ client: documents }))
        .mount(el)
}
```

**SearchBox.vue** — uses `useDocuments()` to query mikser for results:

```vue
<script setup>
import { ref, computed } from 'vue'
import { useDocuments } from 'mikser-io-sdk-vue'

const q = ref('')
const query = computed(() => ({
    filter: q.value ? { 'meta.title': { $regex: q.value } } : { id: '__none__' },
    fields: ['id', 'meta.title'],
    limit:  10,
}))
const { documents } = useDocuments(query)
</script>

<template>
    <input v-model="q" placeholder="Search…" />
    <ul><li v-for="document in documents" :key="document.id">{{ document.meta.title }}</li></ul>
</template>
```

**Trade-offs:** Best performance (static HTML + small Vue bundle, lazy-loaded). Simplest deployment (just files). But Vue doesn't own routing — the URL structure is mikser's responsibility.

> **📦 Full starter project:** **[`examples/islands`](./examples/islands)** — three islands (search, booking, cart-counter) and a simulated mikser-rendered HTML page showing where they mount.

---

### Picking between them

| Question | A (SPA) | B (Hybrid SSG) | C (Islands) |
|---|---|---|---|
| Do you need SEO? | No | **Yes** | **Yes** |
| Is most of the page interactive? | **Yes** | Maybe | No |
| Is content mostly static? | No | Yes | **Yes** |
| Editor + admin in same app? | **Yes** | Editor is the SPA half | Separate admin app |
| Build complexity tolerance | Low | Medium | Low |
| Mikser plugins (post-pdf, post-mjml) used? | No | Maybe | **Yes** |

**Rule of thumb for an agency client site:** start with **C** (islands) for the public site if the content is mostly static, **B** (hybrid SSG) if there's significant interactivity, **A** (pure SPA) only for the admin app. A and B/C often coexist in the same project — the admin is always SPA-shaped; the public face is the project-by-project decision.

---

### When to use which composable

| Composable | Best for | Avoid when |
|---|---|---|
| `client.list()` directly | Build-time, SSR (no live updates needed) | Component that needs to react to changes |
| `useDocument()` / `useDocuments()` | Components in any scenario | Plain Node scripts (use the SDK directly) |
| `live()` underneath both | Always — they wrap it | — |
| `createMikserRouter` | Scenarios A or B (editor app) | Scenario C (mikser owns routes) |
| `generateMikserRoutes` | Scenario B (build step) | Scenarios A or C |
| `useHref` + `useAsset` | Any scenario with Vue components | Mikser-rendered HTML (use the render-href plugin server-side instead) |

`useDocument` / `useDocuments` are safe to use in SSR — when there's no DOM, they fetch the initial snapshot and the `live()` subscription is a no-op (the response stream closes when the server finishes rendering). On the client, hydration re-subscribes and live updates resume.

## Surface

Each export does one job. Three router shapes pick from based on who owns the router.

| Export                  | What it does                                                                |
| ----------------------- | --------------------------------------------------------------------------- |
| `createMikserPlugin`    | Vue plugin — provides the entities client app-wide                          |
| `useMikserClient`       | Injection accessor for the raw client (rare; the other composables use it)  |
| `useDocument`           | Reactive single-document composable with live updates                       |
| `useDocuments`          | Reactive list composable with live updates                                  |
| `createMikserRouter`    | Async factory — **builds a new Vue Router**, mikser owns routing            |
| `useMikserRoutes`       | Live `Ref<RouteRecordRaw[]>` — catalog routes as data, you compose          |
| `useMikserRoutesSync`   | Live diff loop against an **existing** router (addRoute / removeRoute)      |
| `generateMikserRoutes`  | Build-time helper — outputs a routes array for static-build pipelines       |
| `provideHrefIndex` / `useHref`     | Multilingual URL abstraction — resolve `/about` → `/en/about` per locale |
| `useAlternates`                    | Alternate-language URLs for the current route — language switchers + SEO hreflang |
| `provideAssetIndex` / `useAsset`   | Asset / image reference resolution — `/assets/hero.jpg` → real URL + dims  |

## Composables — document data

### `useDocument(id, options?)`

```js
const { document, loading, error, refresh } = useDocument(() => props.entityId)
```

- `id` can be a string, a Ref, or a getter. When it changes, the subscription re-subscribes for the new id.
- `document` is null while loading or when the document doesn't exist.
- Live-updates via `client.live({ id })` under the hood — when the document changes server-side, the ref updates without manual refetch.
- Disposes the subscription on `onUnmounted`.

`useDocument<T>(...)` is generic — pass the entity shape and `document` is typed accordingly. The recommended source for `T` is the `entities.d.ts` emitted by [`mikser-io-plugin-schemas`](https://github.com/almero-digital-marketing/mikser-io-plugin-schemas), which generates one `XxxMeta` alias per layout from Zod schemas in the mikser project:

```ts
import type { MetaByLayout } from '../mikser-content/entities'

const { document } = useDocument<{ meta: MetaByLayout<'article'> }>(id)
// document.value.meta.title / .author / .summary are all typed
```

Without `mikser-io-plugin-schemas`, you can still pass a hand-written interface — `useDocument<MyArticle>(id)` — the SDK doesn't care where `T` comes from.

### `useDocuments(query, options?)`

```js
const { documents, loading, error, refresh } = useDocuments({
    filter: { type: 'document', 'meta.published': true },
    sort:   { 'meta.date': -1 },
    fields: ['id', 'meta.title', 'meta.date', 'meta.summary'],
    limit:  20,
})
```

- `query` can be a static object, a Ref, or a getter. Deep-watched — when the filter / sort / fields / limit change, the subscription re-evaluates.
- `documents` is reactive — pushes to `<v-for>` update in place as the underlying content changes.

## Router integration

### `createMikserRouter(options)`

Builds a Vue Router whose content routes come from mikser. Returns a Promise — `await` it before mounting.

```js
const router = await createMikserRouter({
    client:     documents,
    filter:     { 'meta.published': true, 'meta.route': { $exists: true } },  // default
    mapRoute:   document => ({ path: document.meta.route, name: document.id, component, props, meta }),
    staticRoutes: [
        { path: '/login',     component: () => import('./views/Login.vue') },
        { path: '/dashboard', component: () => import('./views/Dashboard.vue') },
    ],
    notFoundComponent: () => import('./views/NotFound.vue'),
    history: createWebHistory(),
})
```

- **`mapRoute`** is a callback (not config) so each route can inspect the document's full `meta` (layout, type, etc.) and return different shapes per content type.
- The route **`name`** should be the document's `id` — the live sync uses it to know which routes to add / remove as content changes.
- Static routes are mounted *before* content routes; the not-found component (if any) is mounted *after*. Order matters for matching priority.

`createMikserRouter` is the right shape when **mikser owns routing for the page**. When you already have a router with your own static / dynamic routes and want mikser to slot in alongside them, use one of the two helpers below instead.

### `useMikserRoutes(options)`

Returns a `Ref<RouteRecordRaw[]>` that stays in sync with the catalog. The consumer reads `.value` and composes it into their own route list — no router instance owned by the SDK.

```js
import { computed } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { useMikserRoutes } from 'mikser-io-sdk-vue'

const mikserRoutes = useMikserRoutes({
    mapRoute: document => ({
        path: document.meta.route,
        name: document.id,
        component: () => import('./views/DocumentPage.vue'),
        props: { entityId: document.id },
    }),
})

// Compose with your own — Vue Router doesn't watch its routes after
// construction, so this shape works for the initial seed + a watch
// that calls addRoute / removeRoute as mikserRoutes.value changes.
// For the live-diff version of that wiring, see useMikserRoutesSync
// below — it does it for you.
const allRoutes = computed(() => [
    { path: '/login', name: 'login', component: () => import('./views/Login.vue') },
    ...mikserRoutes.value,
])
```

Use this when you want catalog routes as **data** — to feed a static `createRouter()` call at boot, to project into a custom router, or to drive a UI that lists or filters routes (admin pickers, sitemaps, debug panels).

### `useMikserRoutesSync(router, options)`

Wires a live diff loop against an **existing** vue-router instance. Calls `router.addRoute(route)` for catalog entries that appear and `router.removeRoute(name)` for entries that disappear. Use when your app already constructs its own router and you want mikser routes to coexist alongside hand-coded ones.

```js
// main.js — your existing app
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createClient } from 'mikser-io-sdk-api'
import { createMikserPlugin, useMikserRoutesSync } from 'mikser-io-sdk-vue'
import App from './App.vue'

const documents = createClient({ baseUrl: import.meta.env.VITE_MIKSER_URL })
    .entities('public')

// Your existing router with your existing routes
const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/login',     name: 'login',     component: () => import('./views/Login.vue') },
        { path: '/dashboard', name: 'dashboard', component: () => import('./views/Dashboard.vue') },
    ],
})

createApp(App)
    .use(createMikserPlugin({ client: documents }))
    .use(router)
    .mount('#app')

// Plug mikser into the same router — call this from any component
// (App.vue's <script setup>, a layout, etc.). It uses the injected
// client from createMikserPlugin and auto-disposes on unmount.
useMikserRoutesSync(router, {
    mapRoute: document => ({
        path:      document.meta.route,
        name:      document.id,           // required — used as diff key
        component: () => import('./views/DocumentPage.vue'),
        props:     { entityId: document.id },
    }),
})
```

- **`mapRoute` must return routes with a `name`** — the diff loop uses the name to track which routes it has added so it can remove them when the entity disappears. Routes without a name are silently skipped.
- Avoid name collisions between your hand-coded routes and catalog-driven ones; `addRoute` overwrites on duplicate names.
- Returns a dispose function; also auto-disposes on the surrounding effect scope's teardown.

### `generateMikserRoutes(options)`

The build-time version. One-shot list, returns plain route definitions. Use this in a Vite SSG hook or any static-build pipeline that needs to enumerate routes upfront.

```js
// build/generate-routes.mjs
import { writeFile } from 'node:fs/promises'
import { createClient } from 'mikser-io-sdk-api'
import { generateMikserRoutes } from 'mikser-io-sdk-vue'

const documents = createClient({ baseUrl: process.env.MIKSER_URL }).entities('public')

const routes = await generateMikserRoutes({
    client: documents,
    mapRoute: document => ({ path: document.meta.route, name: document.id, /* … */ }),
})

await writeFile('./src/generated/routes.json', JSON.stringify(routes, null, 2))
```

Same `mapRoute` function can power both build-time and runtime — one source of truth for what a content route looks like.

## Multilingual `href()` — `provideHrefIndex` + `useHref`

This is the most load-bearing pattern in the library. If a project has more than one language — and most agency projects do — this is what keeps the codebase from drowning in conditional URL construction.

### The pattern, and why it matters

A multilingual content site has two distinct things:

- **Logical references** — `/about`, `/contact`, `/blog/welcome` — the abstract idea of a page, independent of language. Stable across translations.
- **Deployed URLs** — `/en/about` vs `/fr/a-propos` vs `/de/uber-uns` — the actual paths the server emits, with locale-specific slugs.

Most multilingual setups conflate these. You write `/en/about` in your template, then hard-code conditionals to swap it. Or you push the language into a vue-router prefix and lose the ability to translate slugs. Or you build a custom routing layer in i18n config that diverges from the actual file structure.

`useHref()` makes the separation explicit: **write the logical reference; the resolver picks the deployed URL** based on the current locale and the catalog of published documents. The content author defines the URL for each translation in front-matter; the application code never sees the slug variation.

What this gets you for free:

- Translated slugs (`/uber-uns` in DE, `/a-propos` in FR, `/about` in EN) without per-language code paths
- Reactive locale switching — change `locale.value`, every `:to` updates
- Broken-link visibility — `href('/typo')` returns `/typo` unchanged, so QA sees it in the DOM instead of hitting silent `undefined` failures
- Editor-friendly authoring — translators control their own URLs from front-matter, not from code

It's not flashy. It just removes an entire class of bug.

### Front-matter convention

Three fields on each translatable document:

| Field | Purpose | Example |
|---|---|---|
| `href` | Logical reference — the same across all translations | `/about` |
| `lang` | Which language this translation represents | `en`, `fr`, `de`, `bg` |
| `route` | The deployed URL — what users actually navigate to | `/en/about`, `/fr/a-propos` |

```yaml
# documents/en/about.md
---
title: About us
href:  /about          # logical reference
lang:  en              # which language
route: /en/about       # deployed URL
---

# documents/fr/a-propos.md
---
title: À propos
href:  /about          # same logical ref — this is the FR translation of "about"
lang:  fr
route: /fr/a-propos    # localised slug — the URL the browser navigates to
---

# documents/de/uber-uns.md
---
title: Über uns
href:  /about          # same logical ref
lang:  de
route: /de/uber-uns
---
```

Three documents, one logical `/about`, three localised slugs. `provideHrefIndex` builds the lookup `{ '/about': { en: '/en/about', fr: '/fr/a-propos', de: '/de/uber-uns' } }` from the catalog and keeps it live as content changes.

**Documents without `meta.lang`** (e.g., single-language pages like `/legal/terms`) go in a `'default'` bucket and are resolvable regardless of the requested locale.

### Setup

Once per app, at the root or in a top-level layout component:

```vue
<!-- App.vue -->
<script setup>
import { provideHrefIndex } from 'mikser-io-sdk-vue'
provideHrefIndex()                       // uses the injected client
</script>

<template>
    <router-view />
</template>
```

The index is reactive — it stays in sync with the catalog via `client.live()`. Add a new translation in Decap, the URL becomes resolvable within milliseconds.

### Basic usage

```vue
<script setup>
import { useHref } from 'mikser-io-sdk-vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()             // your existing i18n state
const { href } = useHref(locale)         // reactive — re-resolves when locale changes
</script>

<template>
    <nav>
        <router-link :to="href('/')">Home</router-link>
        <router-link :to="href('/about')">About</router-link>
        <router-link :to="href('/contact')">Contact</router-link>

        <!-- Explicit override — show this link in French regardless of current locale -->
        <a :href="href('/about', 'fr')">Voir en français</a>
    </nav>
</template>
```

When the user toggles `locale.value`, every `:to` binding re-evaluates. No `watch`, no manual update.

### Common patterns

#### Language switcher — link to the current page in every other language

The killer use case. Take the current route, find its logical `href`, then resolve to every other language. The reverse lookup + multi-language fan-out is built into the SDK as `useAlternates()` — no manual index traversal needed.

```vue
<!-- components/LanguageSwitcher.vue -->
<script setup>
import { useRoute } from 'vue-router'
import { useAlternates } from 'mikser-io-sdk-vue'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const { locale, availableLocales } = useI18n()

// Explicit language list — show every locale the app supports, even
// for pages where a translation doesn't exist yet (the SDK falls back
// via href()'s resolution chain). Right shape for a switcher.
const { alternates } = useAlternates({
    route:     () => route.path,
    languages: availableLocales,
})
</script>

<template>
    <ul class="lang-switcher">
        <li v-for="alt in alternates" :key="alt.lang">
            <router-link :to="alt.url">{{ alt.lang.toUpperCase() }}</router-link>
        </li>
    </ul>
</template>
```

The `alternates` ref is reactive on `route.path` — navigate to a different page and the list re-resolves automatically. It already excludes the current page's own language (that lives on `current` from the same composable if you want to include it).

Now a visitor on `/en/about` clicking "FR" lands on `/fr/a-propos` — the *translation*, not just a language switcher that takes them back to the home page (which is what most i18n routing libraries do by default).

#### Breadcrumbs across the section

Same pattern. Logical refs everywhere; the resolver localises:

```vue
<script setup>
import { useHref } from 'mikser-io-sdk-vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const { href } = useHref(locale)

const crumbs = [
    { ref: '/',          label: 'Home' },
    { ref: '/products',  label: 'Products' },
    { ref: '/products/sofa-line', label: 'Sofa Line' },
]
</script>

<template>
    <nav class="crumbs">
        <router-link v-for="c in crumbs" :key="c.ref" :to="href(c.ref)">
            {{ c.label }}
        </router-link>
    </nav>
</template>
```

The labels would normally come from i18n too (`$t('crumbs.products')`). The point is the *URLs* — `c.ref` stays stable; the deployed path resolves per locale.

#### Path parameters

For collections (blog posts, products, categories) where each item has its own translated slug, store the resolved route directly on the item and skip `href()` for that link — `href()` is for the *static* references in your code, not for runtime-resolved item URLs.

```vue
<script setup>
import { useDocuments } from 'mikser-io-sdk-vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

// Query for posts in the current language.
const { documents: posts } = useDocuments(() => ({
    filter: { 'meta.collection': 'posts', 'meta.lang': locale.value },
    sort:   { 'meta.date': -1 },
    fields: ['id', 'meta.title', 'meta.route'],
    limit:  20,
}))
</script>

<template>
    <ul>
        <li v-for="post in posts" :key="post.id">
            <router-link :to="post.meta.route">{{ post.meta.title }}</router-link>
        </li>
    </ul>
</template>
```

Collection items use their own `meta.route` directly. Use `href()` for the navigation chrome (Home, About, Contact, sections) and for cross-references between specific documents.

#### Programmatic navigation

`href()` returns a string — it composes with `router.push()` and any other place a URL is needed:

```js
import { useRouter } from 'vue-router'
import { useHref } from 'mikser-io-sdk-vue'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { locale } = useI18n()
const { href } = useHref(locale)

async function onSubmit() {
    await saveForm()
    router.push(href('/thank-you'))
}
```

### Resolution behavior in detail

The fallback chain: **requested lang → `'default'` bucket → any available language → the input reference unchanged**.

| Call | Index state | Result | Why |
|---|---|---|---|
| `href('/about', 'en')` | `{ '/about': { en: '/en/about', fr: '/fr/a-propos' } }` | `/en/about` | Exact match |
| `href('/about', 'de')` | Same (no DE document exists) | `/en/about` (or the first available) | Falls back to any available language so the link still works |
| `href('/contact', 'en')` | `{ '/contact': { default: '/contact' } }` | `/contact` | Single-language documents live in `default`; matches across any locale request |
| `href('/contact', 'en')` | `{ '/contact': { default: '/contact', en: '/en/contact' } }` | `/en/contact` | Locale-specific wins over default when present |
| `href('/typo')` | Not in index | `/typo` | **Unresolved — pass-through.** Broken links stay visible in the DOM. QA / Lighthouse / link-checkers spot them. |
| `href('/about')` *(no lang passed)* | — | Uses `defaultLangRef` from `useHref(localeRef)` | The composable's default lang |

The pass-through behaviour for unresolved refs is deliberate. Silently returning `undefined` or `'/'` would *hide* link rot from sight. Passing the input through means broken links render as broken anchors (`<a href="/typo">…</a>`) that are immediately greppable in the deployed site, surface in link-check tooling, and crash navigation tests instead of silently no-oping.

### SEO: hreflang tags

For SEO-critical multilingual sites you'll want `<link rel="alternate" hreflang="…">` in the document head for every language version of the current page. The href index is exactly the data structure for that:

```vue
<!-- AppHead.vue (use with Vue Meta / Unhead / Vue 3's built-in head support) -->
<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import { useAlternates } from 'mikser-io-sdk-vue'

const route = useRoute()

// No `languages` arg — return only translations that actually exist.
// Right shape for hreflang: don't advertise pages we don't have.
const { alternates } = useAlternates({ route: () => route.path })

useHead({
    link: computed(() => alternates.value.map(({ lang, url }) => ({
        rel:      'alternate',
        hreflang: lang,
        href:     url,
    }))),
})
</script>
```

Same composable, different shape of the answer — explicit `languages` for switchers (fall back when a translation doesn't exist), no `languages` for SEO (only advertise translations that exist). One catalog, two consumers, no manual index traversal.

### How the index gets built

Under the hood `provideHrefIndex` uses `client.live({ 'meta.href': { $exists: true } })` to subscribe to every document with an `href` field, and recomputes the index whenever the catalog changes. The same SSE stream that powers `useDocument` / `useDocuments` keeps the href map fresh.

This means:

- Adding a new translation in Decap → the new locale becomes resolvable in the SPA within ~1 second, no rebuild
- Renaming a route in front-matter → all `useHref()` consumers update on the next render
- Deleting a document → its locale entry drops out of the index; `href()` falls back through the chain

For SSG (scenario B from above), serialise the index at build time and hydrate from it on boot — same shape, just static instead of live:

```js
// build/generate-href-index.mjs
import { writeFile } from 'node:fs/promises'
import { createClient } from 'mikser-io-sdk-api'

const documents = createClient({ baseUrl: process.env.MIKSER_URL }).entities('public')
const { items } = await documents.list({
    filter: { 'meta.href': { $exists: true } },
    fields: ['id', 'meta'],
    limit:  10_000,
})
const index = {}
for (const d of items) {
    const ref = d.meta?.href, lang = d.meta?.lang ?? 'default'
    const url = d.meta?.route ?? d.meta?.destination ?? ref
    if (!ref) continue
    if (!index[ref]) index[ref] = {}
    index[ref][lang] = url
}
await writeFile('./src/generated/href-index.json', JSON.stringify(index, null, 2))
```

Then ship a tiny replacement for `provideHrefIndex` that reads the JSON and provides it statically. The `useHref()` consumer code doesn't change.

### Server-side correspondence

The Vue-side `href()` mirrors what mikser's own `render-href` plugin does on the server during template rendering. The naming, the front-matter convention, and the fallback semantics are intentionally identical — same `meta.href` / `meta.lang` / `meta.route` fields, same logical-ref-to-deployed-URL resolution.

Practical consequence: if you have a hybrid setup (mikser renders some pages statically, Vue renders others), links between them resolve consistently. A mikser-rendered page that points at `/about` and a Vue-rendered page that calls `href('/about')` produce the same URL for the same locale.

## Asset / image references — `provideAssetIndex` + `useAsset`

Same pattern, for media. Useful when assets have dimensions or srcset that the template needs.

```vue
<!-- App.vue -->
<script setup>
import { provideAssetIndex } from 'mikser-io-sdk-vue'
provideAssetIndex()
</script>
```

```vue
<!-- components/Hero.vue -->
<script setup>
import { useAsset } from 'mikser-io-sdk-vue'
const { image } = useAsset()
</script>

<template>
    <img v-bind="image('/assets/hero.jpg')" />
</template>
```

`image(ref)` returns `{ src, width, height, srcset, alt }` — ready to spread onto an `<img>`. Returns `null` for unresolved refs.

For richer access (raw metadata, custom rendering):

```js
const { asset } = useAsset()
const { url, width, height, meta } = asset('/assets/hero.jpg') ?? {}
```

## What this library doesn't include

Deliberately. Each of these is a per-project decision:

- **A `DocumentPage` component.** Every project renders content differently (markdown engine, layouts, sanitization). `useDocument()` gives you the data; you write the component.
- **A markdown renderer.** Use `markdown-it`, `marked`, or whatever your project standardizes on. If you render Markdown server-side via the `render-markdown` plugin, `document.content` is already HTML.
- **A layout switcher.** Some teams use `<router-view :class="$route.meta.layout">`; some use named layouts; some pick via `<component :is="...">`. Stay neutral.
- **Auth / token UI.** Tokens are configuration — `createClient({ token })` handles them.
- **Vector / semantic search.** Lives in `mikser-io-sdk-vector` (and eventually a Vue companion if it earns its keep).

## TypeScript

Full types ship with the package. Most generics let you narrow the document shape:

```ts
import type { ListEnvelope } from 'mikser-io-sdk-api'

interface Article {
    id: string
    meta: { title: string; date: string; summary?: string }
}

const { documents } = useDocuments<Article>({
    filter: { 'meta.collection': 'articles' },
})

// documents.value is Ref<Article[]>; meta.title autocompletes.
```

The router-related types are forwarded from `vue-router` so `mapRoute` returns `RouteRecordRaw` directly.

## License

MIT
