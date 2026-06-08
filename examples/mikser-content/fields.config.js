// Project field-type definitions — the building blocks every layout
// schema in schemas/ reuses. Named *.config.js to sit next to
// mikser.config.js as a sibling project-level config concern.
//
// Kept outside schemas/ on purpose — that folder is for layout schemas
// (one file per layout name), and mikser-io-schemas treats every .js
// in there as a schema to register. Cross-cutting field definitions
// belong somewhere the plugin doesn't scan.

import { z } from 'zod'

export const lang = z.enum(['en', 'bg'])

// href is the logical reference — '/about', '/articles/welcome'. The
// useHref index uses these as keys to find the per-locale URL.
export const href = z.string().regex(/^\//, 'href must start with "/"')

// route is the actual deployed URL — '/en/about', '/bg/articles/welcome'.
export const route = z.string().regex(/^\//, 'route must start with "/"')

// Front-matter dates parse as Date objects (via the yaml plugin) so
// z.coerce.date() handles both shapes — a plain ISO string would also
// pass.
export const date = z.coerce.date()
