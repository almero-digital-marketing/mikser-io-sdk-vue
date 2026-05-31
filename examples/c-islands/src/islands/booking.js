// Booking-form island. Mounts onto <div data-island="booking">.
// Reads available slots from mikser (a `meta.layout: slot` document
// per available booking time) and POSTs the form to a separate
// booking API. Demonstrates a Vue island that reads from mikser AND
// writes elsewhere — typical agency-client shape.
import { createApp } from 'vue'
import { createClient } from 'mikser-io-sdk-api'
import { createMikserPlugin } from 'mikser-io-sdk-vue'
import BookingForm from '../components/BookingForm.vue'

const el = document.querySelector('[data-island="booking"]')
if (el) {
    const docs = createClient({ baseUrl: el.dataset.baseUrl ?? '/' })
        .entities(el.dataset.endpoint ?? 'public')

    createApp(BookingForm, {
        // Booking submissions go to a separate service, not mikser.
        submitUrl: el.dataset.submitUrl ?? '/api/booking/submit',
    })
        .use(createMikserPlugin({ client: docs }))
        .mount(el)
}
