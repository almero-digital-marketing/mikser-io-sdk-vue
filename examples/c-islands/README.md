# Example C — Mikser HTML + Vue islands

Mikser produces the static HTML. Vue mounts on specific DOM nodes to add interactivity. No vue-router, no SPA shell. Each island is its own tiny bundle that runs only when its mount point exists on the page.

Best of both worlds for content-heavy sites with focused interactivity — search, booking, cart, anything else you'd reach for `<script>` to handle.

## When to pick this

- Content-heavy sites where most pages are pure content
- Sites with one or two interactive features (search, cart, contact form, comments)
- When mikser already renders pages via `render-hbs` / `render-eta` / `render-liquid` and you want to keep that pipeline
- When you want the JS bundle per page to be **only what's actually on the page**
- When SEO is paramount and you don't want hydration tax

## What it shows

- **Multi-entry Vite build** — one bundle per island via `rollupOptions.input`
- Mount-point-driven mounting — each island's entry script looks for its own `[data-island="…"]` element and mounts only if found
- Three island flavours:
  - **`search`** — reads from mikser, no writes (the canonical pattern)
  - **`booking`** — reads from mikser (available slots), POSTs to a separate API (the agency-client typical pattern)
  - **`cart-counter`** — no mikser at all; demonstrates that islands aren't required to be mikser-aware
- `useDocuments` powering live-filtered results inside an island
- Configuration passed via `data-*` attributes (endpoint, base URL, submit URL) so the same bundle can run with different config across pages

## Project structure

```
c-islands/
├── vite.config.js               ← multi-entry build (one entry per island)
├── package.json
├── public/
│   └── example-page.html        ← a simulated mikser-rendered page with all three islands
└── src/
    ├── islands/                 ← entry points — one per island bundle
    │   ├── search.js
    │   ├── booking.js
    │   └── cart-counter.js
    └── components/              ← the Vue components mounted by each entry
        ├── SearchBox.vue
        ├── BookingForm.vue
        └── CartCounter.vue
```

## How it fits with mikser

In a real project:

1. **Mikser** renders the HTML — `documents/en/about.md` → `out/en/about.html` with full content baked in
2. **The layout template** (e.g. `layouts/page.html.hbs`) includes mount points where interactivity is wanted:
   ```hbs
   <div data-island="search" data-endpoint="public"></div>
   ```
3. **Vite builds** the islands into `dist/search.js` etc., output is served from `/islands/*.js`
4. **The HTML layout** references the island bundles via `<script type="module">` only on pages that need them

The mikser-rendered HTML is the source of truth for content. The Vue bundles add behaviour. No double-rendering, no hydration mismatch, no overlap.

## Run it

```bash
cd examples/c-islands
npm install

# Point at your running mikser server
echo "VITE_MIKSER_URL=http://localhost:3001" > .env

npm run dev
```

The dev server opens `public/example-page.html`, which simulates a mikser-rendered page. All three islands mount; modify any of them and Vite hot-reloads just that bundle.

To build:
```bash
npm run build
ls dist/
# search.js  cart-counter.js  booking.js  + maps and chunks
```

Drop these into your mikser layouts as `<script type="module" src="/islands/search.js">` and you're done.

## Conventions worth noting

**`data-island="name"` as the mount selector.** Predictable, semantic, easy to grep for. The entry script's only job is `document.querySelector('[data-island="…"]')` + mount.

**`data-*` attributes for configuration.** Lets the same bundle run with different config across pages (different endpoint per page, different submit URL per page). Avoids stuffing config into the bundle at build time.

**Each island gets its own `createApp`.** No shared root, no shared state between islands by default. If you need shared state (cross-island cart, shared auth), introduce a small module-level singleton — same level of cross-island wiring you'd use in vanilla JS.

**Lazy loading is one line away.** If an island is below the fold:
```js
import('./islands/booking.js')
```
Or use an `IntersectionObserver` to load when the mount point scrolls into view. Mikser doesn't care; the layout template just stops emitting the eager `<script>` and emits a deferred loader instead.

## What to take away

Mikser-rendered HTML + Vue islands is the leanest possible architecture for content-heavy sites with focused interactivity. The HTML is fast and SEO-correct because mikser handles it; the JS is minimal because each page only loads the islands it actually has; the SDK works inside islands exactly the same way it would inside a full SPA.

This pattern is *underrated* — most projects default to "Vue all the way down" because their build tooling encourages it. But for typical agency content sites, this shape produces better Lighthouse scores, smaller bundles, and simpler operations than the alternatives.
