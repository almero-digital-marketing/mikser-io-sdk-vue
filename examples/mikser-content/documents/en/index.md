---
layout: page
component: page
title: Welcome to Acme Co
lang: en
href: /
route: /en/
published: true
nav: true
nav_order: 1
---

Welcome to the demo content set. This document tree powers all three
example projects in `mikser-io-sdk-vue/examples`:

- **pure-spa** queries documents at runtime via `useDocuments`.
- **hybrid-ssg** enumerates them at build time via `generateMikserRoutes`,
  then keeps the editor side live via `useDocument`.
- **islands** consumes the rendered HTML (this page) and mounts Vue
  components onto the `data-island="…"` elements above and below.

Edit this file while `npm run dev` is running and watch all three
example apps refresh.
