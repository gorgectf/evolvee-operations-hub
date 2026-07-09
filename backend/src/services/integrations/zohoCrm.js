const env = require('../../config/env');
const { callExternal, withSync } = require('../apiClient');
const { getZohoAccessToken } = require('./zohoAuth');
const sample = require('../sampleData/zohoCrm.json');

async function getCrmCustomers() {
    const mode = env.modes.zohoCrm;

    return withSync('zoho_crm', mode, async () => {
        if (mode === 'sample') {
            return sample.customers;
        }

        const token = await getZohoAccessToken();
        const options = {
            headers: { Authorization: 'Zoho-oauthtoken ' + token }
        };

        // Page through all contacts; Zoho signals continuation via info.more_records.
        const contacts = [];
        for (let page = 1; ; page++) {
            const url =
                env.zoho.apiBase + '/crm/v6/Contacts' +
                '?fields=Email,Lead_Source,Description' +
                '&per_page=200&page=' + page;
            const data = await callExternal(url, options);

            for (const c of (data.data || [])) {
                contacts.push(c);
            }

            if (!(data.info && data.info.more_records)) {
                break;
            }
        }

        const customers = [];
        for (const c of contacts) {
            customers.push({
                crm_id: c.id,
                email: c.Email,
                segment: c.Lead_Source || 'Unknown',
                lifetime_notes: c.Description || ''
            });
        }

        return customers;
    });
}

module.exports = { getCrmCustomers };
