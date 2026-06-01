---
layout: article
component: article
title: Welcome to the journal
lang: en
href: /articles/welcome
route: /en/articles/welcome
author: Alice Park
date: 2026-05-01
summary: First post — a tour of how this content set drives three different Vue example projects from the same catalog.
published: true
collection: articles
---

This is the first article in the demo journal. Edit it, add a paragraph,
save — and watch every example project that's reading the catalog react.

## Why a single content set across all three examples?

Each scenario (pure-spa / hybrid-ssg / islands) consumes the same catalog
through different rendering shapes. By sharing the source of truth, we
can demonstrate that the SDK works the same in every shape — only the
build tooling and entry point differ. The composables, the dispatch, the
front-matter convention all stay constant.

## What to try

Open this file in your editor, change the title, save. Watch every
running example update in place. That's the entire promise of the SDK
made concrete: the editor's keyboard is the source of truth for what's
on the screen, even after the page loaded.
