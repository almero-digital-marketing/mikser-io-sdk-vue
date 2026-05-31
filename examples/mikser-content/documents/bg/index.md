---
layout: page
title: Добре дошли в Acme Co
lang: bg
href: /
route: /bg/
published: true
nav: true
nav_order: 1
---

Българската версия на началната страница. Същият логически
`href: /` като `documents/en/index.md` — `useHref('/')` връща
`/bg/` при `lang: bg` и `/en/` при `lang: en`.

Едно logical reference, различни URL-и за всеки език. Това е
цялата идея на `useHref` — съдържанието избира пътя си от
front-matter; компонентите никога не се грижат за конкретния
slug.
