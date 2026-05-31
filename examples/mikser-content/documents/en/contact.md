---
layout: page
title: Contact
lang: en
href: /contact
route: /en/contact
published: true
nav: true
nav_order: 3
---

Get in touch — `hello@acme.example`.

This document deliberately exists only in English. The Bulgarian
side of the catalog has no `/contact` translation, so `useHref`
falls back through its chain (requested locale → `default` → any
available language → input pass-through) and a Bulgarian visitor
clicking a "Contact" link still lands here. That fallback is the
point of the abstraction.
