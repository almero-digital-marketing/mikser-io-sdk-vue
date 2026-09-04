// useHref / provideHrefIndex — the multilingual reference layer.
//
// A page links to a LOGICAL reference (/about) and the SDK resolves it to
// whatever URL that reference has in the current language (/en/about,
// /fr/a-propos). Everything here is about that resolution staying correct and
// staying reactive: the index is a live subscription, so a document changing
// on the server has to change what a template renders without a reload.

import { describe, it, expect } from 'vitest'
import { ref, nextTick } from 'vue'

import { provideHrefIndex, useHref, HREF_INDEX } from '../src/href.js'
import { fakeClient, mountWithProvider, mountComposable } from './helpers.js'

const DOCS = [
    { id: '/en/about.md', meta: { href: '/about', lang: 'en', route: '/en/about', title: 'About' } },
    { id: '/fr/about.md', meta: { href: '/about', lang: 'fr', route: '/fr/a-propos', title: 'À propos' } },
]

describe('resolving a reference to a url', () => {
    it('returns the route for the requested language', () => {
        const client = fakeClient(DOCS)
        const { child } = mountWithProvider(
            () => provideHrefIndex({ client }),
            () => useHref(),
        )
        expect(child().href('/about', 'en')).toBe('/en/about')
        expect(child().href('/about', 'fr')).toBe('/fr/a-propos')
    })

    it('falls back to the language the caller bound at setup', () => {
        // The common case: a component knows its locale once and every href()
        // in its template omits the argument.
        const client = fakeClient(DOCS)
        const { child } = mountWithProvider(
            () => provideHrefIndex({ client }),
            () => useHref('fr'),
        )
        expect(child().href('/about')).toBe('/fr/a-propos')
    })

    it('follows a reactive locale, so switching language re-resolves', async () => {
        // unref() on the bound default is what makes this work. Without it a
        // language switch would leave every link pointing at the old locale
        // until a full reload.
        const client = fakeClient(DOCS)
        const lang = ref('en')
        const { child } = mountWithProvider(
            () => provideHrefIndex({ client }),
            () => useHref(lang),
        )
        expect(child().href('/about')).toBe('/en/about')
        lang.value = 'fr'
        await nextTick()
        expect(child().href('/about')).toBe('/fr/a-propos')
    })

    it('maps a url back to its reference', () => {
        const client = fakeClient(DOCS)
        const { child } = mountWithProvider(
            () => provideHrefIndex({ client }),
            () => useHref(),
        )
        expect(child().refFor('/fr/a-propos')).toBe('/about')
    })
})

describe('resolving a reference to its content', () => {
    it('returns the document and its meta', () => {
        // The content companion: a menu or a teaser reads meta from a
        // reference without a second request.
        const client = fakeClient(DOCS)
        const { child } = mountWithProvider(
            () => provideHrefIndex({ client }),
            () => useHref('en'),
        )
        expect(child().doc('/about').id).toBe('/en/about.md')
        expect(child().meta('/about').title).toBe('About')
        expect(child().meta('/about', 'fr').title).toBe('À propos')
    })
})

describe('staying live', () => {
    it('re-resolves when the server pushes a changed catalog', async () => {
        // The index is a computed over a shallowRef the subscription writes.
        // If the push did not land, a renamed page would keep linking to its
        // old url until someone reloaded.
        const client = fakeClient(DOCS)
        const { child } = mountWithProvider(
            () => provideHrefIndex({ client }),
            () => useHref('en'),
        )
        expect(child().href('/about')).toBe('/en/about')

        client.push([
            { id: '/en/about.md', meta: { href: '/about', lang: 'en', route: '/en/about-us' } },
        ])
        await nextTick()
        expect(child().href('/about')).toBe('/en/about-us')
    })

    it('unsubscribes when the owning scope goes away', () => {
        // onScopeDispose. Without it every mounted component leaks a live
        // subscription for the life of the page.
        const client = fakeClient(DOCS)
        const { wrapper } = mountWithProvider(
            () => provideHrefIndex({ client }),
            () => useHref(),
        )
        expect(client.subscriberCount).toBe(1)
        wrapper.unmount()
        expect(client.subscriberCount).toBe(0)
    })
})

describe('using it without providing it', () => {
    it('says which call is missing rather than failing on undefined', () => {
        // The error a developer actually hits when they forget the provider.
        // "Cannot read properties of null" would send them into the SDK.
        expect(() => mountComposable(() => useHref()))
            .toThrow(/provideHrefIndex\(\) must be called/)
    })
})
