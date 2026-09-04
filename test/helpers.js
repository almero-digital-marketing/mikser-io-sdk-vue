// A fake mikser client, and a way to mount a composable.
//
// The SDK's composables take a client and subscribe to it with client.live(),
// so the client is the seam: these tests drive it directly rather than
// standing up an HTTP server. What matters is that a push through live()
// reaches the reactive value a template would read.

import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'

/**
 * A client whose live() subscription can be driven from the test.
 * `push(docs)` delivers a new document set to every subscriber, the way the
 * real client does when the server sends an update.
 */
export function fakeClient(initial = []) {
    const subscribers = new Set()
    let latest = initial
    return {
        disposed: 0,
        live(filter, cb) {
            subscribers.add(cb)
            cb(latest)
            return () => { subscribers.delete(cb); this.disposed++ }
        },
        push(docs) {
            latest = docs
            for (const cb of subscribers) cb(docs)
        },
        get subscriberCount() { return subscribers.size },
    }
}

/**
 * Mount `setup` inside a real component so provide/inject and
 * onScopeDispose behave as they do in an app. Returns the setup's return
 * value plus the wrapper, so a test can unmount and assert cleanup.
 */
export function mountComposable(setup) {
    let exposed
    const wrapper = mount(defineComponent({
        setup() { exposed = setup(); return () => h('div') },
    }))
    return { ...exposed, wrapper, result: exposed }
}

/** Mount a provider and a child, so inject() crosses a real boundary. */
export function mountWithProvider(provideSetup, childSetup) {
    let child
    const Child = defineComponent({
        setup() { child = childSetup(); return () => h('span') },
    })
    const wrapper = mount(defineComponent({
        components: { Child },
        setup() { provideSetup(); return () => h(Child) },
    }))
    return { child: () => child, wrapper }
}
