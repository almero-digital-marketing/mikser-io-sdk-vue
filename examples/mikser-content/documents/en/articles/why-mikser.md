---
layout: article
component: article
title: Why mikser, not a headless CMS
lang: en
href: /articles/why-mikser
route: /en/articles/why-mikser
author: Alice Park
date: 2026-05-08
summary: The migration tax across vendor CMS versions is real. Files-as-source removes it.
published: true
collection: articles
---

Over the last decade we've watched teams pay the migration tax across
Strapi v3→v4, KeystoneJS rewrites, Ghost API turnovers, and countless
smaller vendor pivots. The cost isn't theoretical: it's three months of
billable hours every two to three years, per client site, indefinitely.

mikser treats this as a structural problem to solve, not a fact of life.
Content lives as `.md` and `.yml` files on disk. Build outputs are plain
HTML / PDF / email. The catalog is derived state, not the source. Move
hosts, change build tools, pivot CMSes — the content survives unchanged.

This article is itself an example of the property. The file you're
reading is `documents/en/articles/why-mikser.md` in the
`mikser-io-sdk-vue/examples/mikser-content` repo. Copy it elsewhere; it
opens in any text editor; it renders correctly with any markdown
processor. That's the contract.
