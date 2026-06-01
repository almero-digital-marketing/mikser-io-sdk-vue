// Marketing landing page — campaigns, promo pages.
import { z } from 'zod'
import { lang, href, route } from '../fields.config.js'

const cta = z.object({
    label: z.string().min(1),
    // CTA targets are deployed routes, not logical hrefs — the editor
    // already chose the destination locale when authoring the campaign.
    href:  route,
})

export default z.object({
    component:    z.literal('landing'),
    layout:    z.string().optional(),
    title:     z.string().min(1),
    lang,
    href,
    route,
    published: z.boolean(),

    hero:      z.string().url(),
    cta:       cta,
})
