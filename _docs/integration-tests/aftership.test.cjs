// AfterShip — checks the API key by listing one tracking.
const { http, mode, need, run } = require('./_runner.cjs');

async function test() {
    mode('AFTERSHIP_MODE');
    need('AFTERSHIP_API_KEY');

    const url = 'https://api.aftership.com/tracking/2025-01/trackings?limit=1';
    const data = await http(url, { headers: { 'as-api-key': process.env.AFTERSHIP_API_KEY } });

    const trackings = (data.data && data.data.trackings) || [];
    return `reached Trackings API (${trackings.length} tracking sampled)`;
}

module.exports = { name: 'AfterShip', test };
if (require.main === module) run([module.exports]);
