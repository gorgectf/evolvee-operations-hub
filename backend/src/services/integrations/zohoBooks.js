const env = require('../../config/env');
const { callExternal, recordSync } = require('../apiClient');
const { getZohoAccessToken } = require('./zohoAuth');
const sample = require('../sampleData/zohoBooks.json');

async function getMonthlyRevenue() {
    const mode = env.modes.zohoBooks;

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

            let invoices = [];
            if (data.invoices) {
                invoices = data.invoices;
            }

            const byMonth = {};
            for (const inv of invoices) {
                let dateString = '';
                if (inv.date) {
                    dateString = inv.date;
                }
                const m = dateString.slice(0, 7);

                if (m) {
                    let total = 0;
                    if (inv.total) {
                        total = Number(inv.total);
                    }

                    if (byMonth[m] === undefined) {
                        byMonth[m] = 0;
                    }
                    byMonth[m] = byMonth[m] + total;
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