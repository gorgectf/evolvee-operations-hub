const env = require('../../config/env');
const { callExternal, recordSync } = require('../apiClient');
const { getZohoAccessToken } = require('./zohoAuth');
const sample = require('../sampleData/zohoBooks.json');

async function getMonthlyRevenue() {
    const mode = env.modes.zohoBooks;

    if (mode === 'off') {
        await recordSync('zoho_books', 'off', true);
        return [];
    }

    try {
        let months;

        if (mode === 'sample') {
            months = sample.monthly_revenue;
        } else {
            const token = await getZohoAccessToken();

            const url =
                env.zoho.apiBase + '/books/v3/invoices' +
                '?organization_id=' + env.zoho.orgId +
                '&status=paid' +
                '&per_page=200';

            const options = {
                headers: { Authorization: 'Zoho-oauthtoken ' + token }
            };
            const data = await callExternal(url, options);

            const invoices = data.invoices || [];

            const byMonth = {};
            for (const inv of invoices) {
                const m = (inv.date || '').slice(0, 7);

                if (m) {
                    const total = inv.total ? Number(inv.total) : 0;
                    byMonth[m] = (byMonth[m] || 0) + total;
                }
            }

            const monthKeys = Object.keys(byMonth);
            monthKeys.sort();

            months = [];
            for (const month of monthKeys) {
                months.push({
                    month: month,
                    revenue: byMonth[month]
                });
            }
        }

        await recordSync('zoho_books', mode, true);
        return months;
    } catch (err) {
        await recordSync('zoho_books', mode, false, err.message);
        throw err;
    }
}

module.exports = { getMonthlyRevenue };