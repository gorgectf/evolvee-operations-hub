const env = require('../../config/env');
const { callExternal, withSync } = require('../apiClient');
const sample = require('../sampleData/partnerDashboard.json');

// Build the summary endpoint URL, tolerating a trailing slash on the base.
function buildSummaryUrl(baseUrl) {
    return baseUrl.replace(/\/$/, '') + '/api/ops-summary/';
}

// off:   return the bundled sample so the tile renders (never blank).
// sample: bundled demo data.
// live:  call the Evolvée Partners Django API with the shared key.
async function getPartnerSummary() {
    const mode = env.modes.partnerDashboard;

    return withSync('partnerDashboard', mode, async () => {
        if (mode === 'sample') {
            return sample;
        }
        const url = buildSummaryUrl(env.partnerDashboard.baseUrl);
        return callExternal(url, {
            headers: { 'X-API-Key': env.partnerDashboard.apiKey }
        });
    }, sample);
}

module.exports = { getPartnerSummary, buildSummaryUrl };
