const env = require('../../config/env');
const { callExternal, recordSync } = require('../apiClient');

async function getPartnerData() {
    const mode = env.modes.qrPartner;

    if (mode !== 'live') {
        await recordSync('qr_partner', 'placeholder', true, 'Awaiting QR dashboard API access');
        return {
            placeholder: true,
            partners: [],
            message: 'QR partner dashboard integration pending — awaiting API access.'
        };
    }

    try {
        const url = env.qrPartner.apiBase + '/partners';
        const options = {
            headers: { Authorization: 'Bearer ' + env.qrPartner.apiKey }
        };
        const data = await callExternal(url, options);

        const partners = data.partners || [];

        await recordSync('qr_partner', 'live', true);
        return {
            placeholder: false,
            partners: partners
        };
    } catch (err) {
        await recordSync('qr_partner', 'live', false, err.message);
        throw err;
    }
}

module.exports = { getPartnerData };