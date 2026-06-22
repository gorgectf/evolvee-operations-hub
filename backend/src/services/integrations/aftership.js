const env = require('../../config/env');
const { callExternal, recordSync } = require('../apiClient');
const sample = require('../sampleData/aftership.json');

async function getTrackings() {
    const mode = env.modes.aftership;

    try {
        let trackings;

        if (mode === 'sample') {
            trackings = sample.trackings;
        } else {
            const url = 'https://api.aftership.com/tracking/2025-01/trackings';
            const options = {
                headers: { 'as-api-key': env.aftership.apiKey }
            };
            const data = await callExternal(url, options);

            let rawTrackings = [];
            if (data.data && data.data.trackings) {
                rawTrackings = data.data.trackings;
            }

            trackings = [];
            for (const t of rawTrackings) {
                let orderId = '';
                if (t.order_id) {
                    orderId = t.order_id;
                }

                let customer = '';
                if (t.customer_name) {
                    customer = t.customer_name;
                }

                let lastUpdate = '';
                if (t.updated_at) {
                    lastUpdate = t.updated_at.slice(0, 10);
                }

                trackings.push({
                    tracking_number: t.tracking_number,
                    order_id: orderId,
                    courier: t.slug,
                    status: t.tag,
                    customer: customer,
                    last_update: lastUpdate
                });
            }
        }

        await recordSync('aftership', mode, true);
        return trackings;
    } catch (err) {
        await recordSync('aftership', mode, false, err.message);
        throw err;
    }
}

module.exports = { getTrackings };