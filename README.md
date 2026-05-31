# mikser-io-sdk-vue

Vue 3 composables and router integration for a [mikser-io](https://github.com/almero-digital-marketing/mikser-io) server. Built on top of [`mikser-io-sdk-api`](https://github.com/almero-digital-marketing/mikser-io-sdk-api) — same patterns (`live()`, `list()`, `entities` endpoints, the live-updates contract), wrapped as idiomatic Vue 3.

Zero own dependencies. Vue 3 + Vue Router 4 (optional) + `mikser-io-sdk-api` 2.x as peer deps.

## Install

```bash
npm install mikser-io-sdk-vue mikser-io-sdk-api vue vue-router
```

`vue-router` is an optional peer — install only if you use `createMikserRouter` or `generateMikserRoutes`.

## Quick start

```js
// main.js
import { createApp } from 'vue'
import { createWebHistory } from 'vue-router'
import { createClient } from 'mikser-io-sdk-api'
import { createMikserPlugin, createMikserRouter } from 'mikser-io-sdk-vue'
import App from './App.vue'

const docs = createClient({ baseUrl: import.meta.env.VITE_MIKSER_URL })
    .entities('public')

const router = await createMikserRouter({
    client: docs,
    mapRoute: doc => ({
        path: doc.meta.route,
        name: doc.id,
        component: () => import('./views/DocumentPage.vue'),
        props: route => ({ docId: doc.id, params: route.params }),
        meta: { layout: doc.meta?.layout, title: doc.meta?.title },
    }),
    notFoundComponent: () => import('./views/NotFound.vue'),
    history: createWebHistory(),
})

createApp(App)
    .use(createMikserPlugin({ client: docs }))
    .use(router)
    .mount('#app')
```

An article index page that lists posts as they're published, and a detail page that re-renders when an editor saves changes. Both live, both backed by mikser.

```vue
<!-- views/ArticleIndex.vue — uses useDocuments to list -->
<script setup>
import { useDocuments } from 'mikser-io-sdk-vue'

// Reactive list — new articles appear without refresh; deleted ones disappear.
const { documents: articles, loading } = useDocuments({
    filter: { type: 'document', 'meta.collection': 'articles', 'meta.published': true },
    sort:   { 'meta.date': -1 },
    fields: ['id', 'meta.title', 'meta.date', 'meta.summary', 'meta.route'],
    limit:  20,
})
</script>

<template>
    <h1>Articles</h1>
    <p v-if="loading && !articles.length">Loading…</p>
    <ul v-else>
        <li v-for="a in articles" :key="a.id">
            <router-link :to="a.meta.route">
                <h2>{{ a.meta.title }}</h2>
                <time>{{ a.meta.date }}</time>
                <p>{{ a.meta.summary }}</p>
            </router-link>
        </li>
    </ul>
</template>
```

```vue
<!-- views/DocumentPage.vue — uses useDocument to show one -->
<script setup>
import { useDocument } from 'mikser-io-sdk-vue'

const props = defineProps({ docId: String })

// Live single doc — re-renders when an editor saves the file.
const { document, loading } = useDocument(() => props.docId)
</script>

<template>
    <article v-if="document">
        <h1>{{ document.meta?.title }}</h1>
        <time v-if="document.meta?.date">{{ document.meta.date }}</time>
        <div v-html="document.content" />
    </article>
    <p v-else-if="loading">Loading…</p>
    <p v-else>Not found.</p>
</template>
```

The two compose: editor publishes a new article in Decap → the watcher fires → `ArticleIndex` gets a `create` event and the new card appears at the top of the list, all without a page refresh. Click into it → `DocumentPage` mounts → another `useDocument` subscription opens → when the editor edits the body, the article re-renders in place.

That's the whole story. Everything below is detail.

## Scenarios — picking the right shape for your project

Three common shapes. Each makes a different trade between SEO, build complexity, and how much Vue does. Pick before you start; mixing them mid-project is painful.

### A) Pure SPA — runtime everything, live everywhere

**When:** Editor UIs, admin dashboards, internal apps. SEO doesn't matter. You want the fastest dev loop and the lowest build complexity.

**How it works:** No build-time route enumeration. The app fetches the route list at boot, mounts the router, and stays subscribed to changes. Editing a doc → SSE event → router updates → UI updates. No rebuild ever.

```js
// main.js
import { createApp } from 'vue'
import { createWebHistory } from 'vue-router'
import { createClient } from 'mikser-io-sdk-api'
import { createMikserPlugin, createMikserRouter } from 'mikser-io-sdk-vue'
import App from './App.vue'

const docs = createClient({ baseUrl: import.meta.env.VITE_MIKSER_URL })
    .entities('public')

// Async — the app waits for the initial document list.
const router = await createMikserRouter({
    client:   docs,
    mapRoute: doc => ({
        path:      doc.meta.route,
        name:      doc.id,
        component: () => import('./views/DocumentPage.vue'),
        props:     route => ({ docId: doc.id, params: route.params }),
        meta:      { layout: doc.meta?.layout },
    }),
    history:           createWebHistory(),
    notFoundComponent: () => import('./views/NotFound.vue'),
})

createApp(App)
    .use(createMikserPlugin({ client: docs }))
    .use(router)
    .mount('#app')
```

**Trade-offs:** Fastest to set up. Worst for SEO (the public-facing HTML is empty until JS loads). Initial boot pays a `list()` round trip (~100-500ms for typical sites).

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

const docs = createClient({ baseUrl: process.env.MIKSER_URL }).entities('public')
const routes = await generateMikserRoutes({ client: docs, mapRoute })

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
    const docs = createClient({ baseUrl: '/' })   // same-origin
        .entities(el.dataset.endpoint)
    createApp(SearchBox)
        .use(createMikserPlugin({ client: docs }))
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
    <ul><li v-for="d in documents" :key="d.id">{{ d.meta.title }}</li></ul>
</template>
```

**Trade-offs:** Best performance (static HTML + small Vue bundle, lazy-loaded). Simplest deployment (just files). But Vue doesn't own routing — the URL structure is mikser's responsibility.

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

Seven exports. Each does one job.

| Export                  | What it does                                                                |
| ----------------------- | --------------------------------------------------------------------------- |
| `createMikserPlugin`    | Vue plugin — provides the entities client app-wide                          |
| `useMikserClient`       | Injection accessor for the raw client (rare; the other composables use it)  |
| `useDocument`           | Reactive single-document composable with live updates                       |
| `useDocuments`          | Reactive list composable with live updates                                  |
| `createMikserRouter`    | Async factory — builds a Vue Router with content routes from mikser         |
| `generateMikserRoutes`  | Build-time helper — outputs a routes array for static-build pipelines       |
| `provideHrefIndex` / `useHref`     | Multilingual URL abstraction — resolve `/about` → `/en/about` per locale |
| `provideAssetIndex` / `useAsset`   | Asset / image reference resolution — `/assets/hero.jpg` → real URL + dims  |

## Composables — document data

### `useDocument(id, options?)`

```js
const { document, loading, error, refresh } = useDocument(() => props.docId)
```

- `id` can be a string, a Ref, or a getter. When it changes, the subscription re-subscribes for the new id.
- `document` is null while loading or when the doc doesn't exist.
- Live-updates via `client.live({ id })` under the hood — when the document changes server-side, the ref updates without manual refetch.
- Disposes the subscription on `onUnmounted`.

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
    client:     docs,
    filter:     { 'meta.published': true, 'meta.route': { $exists: true } },  // default
    mapRoute:   doc => ({ path: doc.meta.route, name: doc.id, component, props, meta }),
    staticRoutes: [
        { path: '/login',     component: () => import('./views/Login.vue') },
        { path: '/dashboard', component: () => import('./views/Dashboard.vue') },
    ],
    notFoundComponent: () => import('./views/NotFound.vue'),
    history: createWebHistory(),
})
```

- **`mapRoute`** is a callback (not config) so each route can inspect the doc's full `meta` (layout, type, etc.) and return different shapes per content type.
- The route **`name`** should be the document's `id` — the live sync uses it to know which routes to add / remove as content changes.
- Static routes are mounted *before* content routes; the not-found component (if any) is mounted *after*. Order matters for matching priority.

### `generateMikserRoutes(options)`

The build-time version. One-shot list, returns plain route definitions. Use this in a Vite SSG hook or any static-build pipeline that needs to enumerate routes upfront.

```js
// build/generate-routes.mjs
import { writeFile } from 'node:fs/promises'
import { createClient } from 'mikser-io-sdk-api'
import { generateMikserRoutes } from 'mikser-io-sdk-vue'

const docs = createClient({ baseUrl: process.env.MIKSER_URL }).entities('public')

const routes = await generateMikserRoutes({
    client: docs,
    mapRoute: doc => ({ path: doc.meta.route, name: doc.id, /* … */ }),
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

The killer use case. Take the current route, find its logical `href`, then resolve to every other language. This is the *one* place where you go from a URL back to a reference, which is why the index also exposes the raw data.

```vue
<!-- components/LanguageSwitcher.vue -->
<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useHref } from 'mikser-io-sdk-vue'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const { locale, availableLocales } = useI18n()
const { href, index } = useHref(locale)

// Find the logical href for the current URL: reverse-lookup in the index.
const currentRef = computed(() => {
    for (const [ref, byLang] of Object.entries(index.value)) {
        if (Object.values(byLang).includes(route.path)) return ref
    }
    return null
})

// For each available language, resolve the same logical ref.
const alternates = computed(() =>
    currentRef.value
        ? availableLocales.map(lang => ({
            lang,
            to:    href(currentRef.value, lang),
            label: lang.toUpperCase(),
          }))
        : [],
)
</script>

<template>
    <ul class="lang-switcher">
        <li v-for="alt in alternates" :key="alt.lang"
            :class="{ active: alt.lang === locale }">
            <router-link :to="alt.to">{{ alt.label }}</router-link>
        </li>
    </ul>
</template>
```

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
| `href('/about', 'de')` | Same (no DE doc exists) | `/en/about` (or the first available) | Falls back to any available language so the link still works |
| `href('/contact', 'en')` | `{ '/contact': { default: '/contact' } }` | `/contact` | Single-language docs live in `default`; matches across any locale request |
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
import { useHref } from 'mikser-io-sdk-vue'

const route = useRoute()
const { index } = useHref()

const alternates = computed(() => {
    // Find the logical ref for the current URL
    let currentRef = null
    for (const [ref, byLang] of Object.entries(index.value)) {
        if (Object.values(byLang).includes(route.path)) { currentRef = ref; break }
    }
    if (!currentRef) return []

    const entries = index.value[currentRef]
    return Object.entries(entries).filter(([lang]) => lang !== 'default')
})

useHead({
    link: computed(() => alternates.value.map(([lang, url]) => ({
        rel:      'alternate',
        hreflang: lang,
        href:     url,
    }))),
})
</script>
```

Now every page automatically advertises its translations to search engines, sourced from the same catalog index that powers the navigation. One index, two consumers.

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

const docs = createClient({ baseUrl: process.env.MIKSER_URL }).entities('public')
const { items } = await docs.list({
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
