// QR Partner dashboard — checks the (future) partner API once access is live.
const { http, mode, need, run } = require('./_runner.cjs');

async function test() {
    mode('QR_PARTNER_MODE'); // placeholder until API access is confirmed -> SKIP
    need('QR_PARTNER_API_BASE', 'QR_PARTNER_API_KEY');

    const url = process.env.QR_PARTNER_API_BASE + '/partners';
    const data = await http(url, { headers: { Authorization: 'Bearer ' + process.env.QR_PARTNER_API_KEY } });

    return `reached Partners API (${(data.partners || []).length} partner(s))`;
}

module.exports = { name: 'QR Partner', test };
if (require.main === module) run([module.exports]);
