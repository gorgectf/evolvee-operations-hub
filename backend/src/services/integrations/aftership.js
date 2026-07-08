const env = require('../../config/env');
const { callExternal, withSync } = require('../apiClient');
const sample = require('../sampleData/aftership.json');

async function getTrackings() {
    const mode = env.modes.aftership;

    return withSync('aftership', mode, async () => {
        if (mode === 'sample') {
            return sample.trackings;
        }

        const url = 'https://api.aftership.com/tracking/2026-01/trackings';
        const options = {
            headers: { 'as-api-key': env.aftership.apiKey }
        };
        const data = await callExternal(url, options);

        const rawTrackings = (data.data && data.data.trackings) || [];

        const trackings = [];
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

        return trackings;
    });
}

module.exports = { getTrackings };
