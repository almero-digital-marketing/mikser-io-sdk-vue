// Generic page — about, contact, the home index.
import { z } from 'zod'
import { lang, href, route } from '../fields.config.js'

export default z.object({
    component:    z.literal('page'),
    layout:    z.string().optional(),
    title:     z.string().min(1),
    lang,
    href,
    route,
    published: z.boolean(),
    nav:       z.boolean().optional(),
    nav_order: z.number().int().optional(),
})
