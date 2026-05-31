// Catalogue product — what a `pure-spa` product listing renders.
import { z } from 'zod'
import { lang, href, route } from '../fields.config.js'

export default z.object({
    layout:    z.literal('product'),
    title:     z.string().min(1),
    lang,
    href,
    route,
    published: z.boolean(),

    sku:       z.string().regex(/^[A-Z]{3}-\d{3}$/, 'sku format is XXX-### (e.g. LMP-001)'),
    price:     z.number().positive(),
    image:     z.string().url(),
    in_stock:  z.boolean(),
})
