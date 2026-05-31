# Shared mikser content for the examples

A standalone mikser project. Run it once, point all three Vue examples at it. They share one catalog, three rendering shapes.

## What's in it

| Path | Purpose |
|---|---|
| `mikser.config.js` | Plugins (`documents`, `layouts`, `plugin-schemas`, `render-hbs`, `render-markdown`, `api`) + a `public` api endpoint with `list` and `subscribe` operations |
| `layouts/page.html.hbs` | Generic page template — wraps content with header, search island mount point, cart-counter island mount point. Used only by the `islands` example. |
| `schemas/*.js` | Zod schemas — one per layout (`page`, `article`, `product`, `landing`, `slot`). `mikser-io-plugin-schemas` validates every loaded entity against the schema that matches its `meta.layout`, and emits `entities.d.ts` for the Vue apps to import as types. |
| `documents/en/*` | Pages, articles, products, a landing page, booking slots |
| `documents/bg/*` | Bulgarian translations of `index` and `about` — demonstrates `useHref()`'s multilingual fallback chain |

### Front-matter shapes used in the catalog

| Layout | Where it appears | Required meta fields | Vue view |
|---|---|---|---|
| `page` | `index.md`, `about.md`, `contact.md` | title, lang, href, route, published, nav, nav_order | `PageView` (fallback) |
| `article` | `articles/*.md` | + author, date, summary, collection | `ArticleView` |
| `product` | `products/*.md` | + sku, price, image, in_stock | `ProductView` |
| `landing` | `campaigns/*.md` | + hero, cta { label, href } | `LandingView` |
| `slot` | `slots/*.md` | + starts_at, duration_minutes, available | (no view — surfaces inside `BookingForm.vue` island only) |

The body is plain Markdown; mikser's `render-markdown` plugin converts it to HTML for the catalog. The Vue apps consume that HTML via `document.content` and render it with `v-html`.

## Run it

```bash
cd examples/mikser-content
npm install
npm run dev
```

That starts mikser with `--server --watch`. The HTTP API is available at <http://localhost:3001>:

- `POST /api/public/entities/query` — body-based queries
- `GET  /api/public/entities` — URL-encoded queries
- `GET  /api/public/entities/subscribe` — SSE stream for live updates

Then in each of the Vue example projects:

```
VITE_MIKSER_URL=http://localhost:3001
MIKSER_URL=http://localhost:3001
```

Start them up in separate terminals:

```bash
# Terminal 1 — the content server
cd examples/mikser-content && npm run dev

# Terminal 2 — pure SPA
cd examples/pure-spa && npm run dev

# Terminal 3 — hybrid editor (the public side is a build, not a dev server)
cd examples/hybrid-ssg && npm run dev:editor

# Terminal 4 — islands
cd examples/islands && npm run dev
```

Now every change to a `.md` file under `documents/` propagates everywhere.

## What to try (the live-updates demo)

1. Open all three Vue examples in your browser at once.
2. Edit `documents/en/products/desk-organizer.md` in your editor.
3. Change `in_stock: false` to `in_stock: true`.
4. Save.

In every example showing that product:

- `pure-spa` re-renders `ProductView.vue` — button enables, label flips
- `hybrid-ssg`'s editor at `/admin/` does the same (the public, pre-rendered build doesn't, by design — that's the point of the hybrid split)
- `islands` — if you wire the `cart-counter` to surface stock state, that updates too

Same `useDocument` composable on the client. Same SSE event from the server. Same file on disk as the source of truth.

## Conventions that matter

- **`meta.published: true`** — required for visibility. The api endpoint's `query` filter rejects everything else. Useful for drafts.
- **`meta.layout`** — drives the Vue dispatch (which view component renders this document). Match the keys in each example's `route-mapping.js`.
- **`meta.href`** — the logical reference (same across all translations).
- **`meta.route`** — the deployed URL (different per translation). Vue's `meta.route` is what shows in the address bar; `useHref` returns it.
- **`meta.lang`** — which language this translation represents. Documents without `meta.lang` go in `useHref`'s `'default'` bucket and resolve regardless of locale request.

## What mikser produces vs. what the SDK exposes

Two outputs from one content set:

1. **`out/` (static)** — mikser renders every document through `layouts/page.html.hbs` into `out/<route>.html`. The `islands` example consumes this directly (or a deployed copy).
2. **HTTP api (live)** — mikser exposes the catalog via the `api` plugin at `:3001/api/public/...`. The `pure-spa` and `hybrid-ssg` examples consume this. SSE keeps every connected client in sync.

The `hybrid-ssg` build script (`build/generate-routes.mjs`) reads from the api at build time, then doesn't talk to the server again. The editor side talks to the api at runtime and stays subscribed.

## Editing tips

mikser's watch mode re-runs the affected lifecycle phases per file change — adding a new document fires `create`; editing an existing one fires `update`; deleting fires `delete`. SSE pushes each to every active subscription whose filter matches.

Try adding a new file under `documents/en/articles/` while the examples are running. It appears at the top of `ArticleIndex.vue` in `pure-spa` and `hybrid-ssg`'s editor — no manual refresh.

## Schemas (typed front-matter)

The `schemas/` folder holds one Zod schema per layout. `mikser-io-plugin-schemas` does two things with them:

1. **Validates each entity's `meta` against the matching schema** as it's loaded. The demo runs in `onError: 'warn'` mode, so a typo (e.g. dropping `author` from an article) shows up as a server log line — the entity still appears in the catalog and the Vue apps still render it. Flip to `onError: 'fail'` in `mikser.config.js` to make the build exit non-zero on the first invalid entity.
2. **Emits `entities.d.ts`** at the project root after every build, exposing one `XxxMeta` type per layout plus a `MetaByLayout<L>` helper. The Vue apps import from this file to get typed `useDocument` results:

   ```ts
   import type { MetaByLayout } from '../mikser-content/entities'
   import { useDocument } from 'mikser-io-sdk-vue'

   const { document } = useDocument<{ meta: MetaByLayout<'article'> }>(id)
   //                                                            ↑
   //                          autocomplete on .title / .author / .summary
   ```

Edit a schema while the server is running and the plugin re-validates affected entities and re-emits `entities.d.ts` immediately — same HMR shape as the rest of mikser.
