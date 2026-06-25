const env = require('../../config/env');
const { callExternal, recordSync } = require('../apiClient');
const sample = require('../sampleData/aftership.json');

async function getTrackings() {
    const mode = env.modes.aftership;

    if (mode === 'off') {
        await recordSync('aftership', 'off', true);
        return [];
    }

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

            const rawTrackings = (data.data && data.data.trackings) || [];

            trackings = [];
            for (const t of rawTrackings) {
                trackings.push({
                    tracking_number: t.tracking_number,
                    order_id: t.order_id || '',
                    courier: t.slug,
                    status: t.tag,
                    customer: t.customer_name || '',
                    last_update: t.updated_at ? t.updated_at.slice(0, 10) : ''
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