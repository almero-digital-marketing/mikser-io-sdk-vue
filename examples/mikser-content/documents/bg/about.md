---
layout: page
component: page
title: За нас
lang: bg
href: /about
route: /bg/za-nas
published: true
nav: true
nav_order: 2
---

Българската версия на страницата "About us". Забележете, че
`route: /bg/za-nas` използва локализиран slug — не
`/bg/about`. Това е смисълът на разделянето между `meta.href`
(логическата препратка) и `meta.route` (реалния URL):
преводачите имат пълна свобода върху URL-ите си.

`useHref('/about', 'bg')` връща `/bg/za-nas`. Същият код който
рендира навигацията работи и в двата езика без промени —
просто се сменя `locale.value` и всички `:to` биндинги се
обновяват.
