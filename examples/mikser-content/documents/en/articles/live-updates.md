---
layout: article
component: article
title: SSE-driven live updates
lang: en
href: /articles/live-updates
route: /en/articles/live-updates
author: Dimitar Kolev
date: 2026-05-15
summary: How useDocument and useDocuments stay in sync with the editor's keyboard via Server-Sent Events.
published: true
collection: articles
---

The `live()` primitive inside `mikser-io-sdk-api` opens a Server-Sent
Events stream against the running mikser server. Every cycle through
the lifecycle — file change, programmatic API write, anything that
triggers `runtime.process()` — fires `create` / `update` / `delete`
events to every active subscription whose filter matches.

In the Vue SDK, `useDocument` and `useDocuments` wrap that primitive
in reactive refs. Their callers (`ArticleIndex.vue`, `ArticleView.vue`,
etc.) write idiomatic Vue and get live updates for free.

To see it: open this article in any of the three Vue examples, then
edit this file in your editor. The headline, the body, the byline —
all re-render in place. No refresh, no manual fetch, no polling.
