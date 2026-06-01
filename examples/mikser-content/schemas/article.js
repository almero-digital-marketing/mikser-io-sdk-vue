// Editorial articles in the journal.
import { z } from 'zod'
import { lang, href, route, date } from '../fields.config.js'

export default z.object({
    component:     z.literal('article'),
    layout:    z.string().optional(),
    title:      z.string().min(1),
    lang,
    href,
    route,
    author:     z.string().min(1),
    date,
    summary:    z.string().max(280),
    published:  z.boolean(),
    collection: z.literal('articles'),
})
