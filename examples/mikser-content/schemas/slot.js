// Bookable time slot — drives the `pure-spa` live-availability demo.
// Slots have a route but no logical href — there's no reason to link
// directly to a slot from another locale's content; the booking grid
// renders them from a list, not via a router-link.
import { z } from 'zod'
import { lang, route, date } from '../fields.config.js'

export default z.object({
    component:           z.literal('slot'),
    layout:    z.string().optional(),
    title:            z.string().min(1),
    lang,
    route,
    published:        z.boolean(),

    starts_at:        date,
    duration_minutes: z.number().int().positive(),
    available:        z.boolean(),
})
