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

        const url =
            env.zoho.apiBase + '/crm/v6/Contacts' +
            '?fields=Email,Lead_Source,Description' +
            '&per_page=200';

        const options = {
            headers: { Authorization: 'Zoho-oauthtoken ' + token }
        };
        const data = await callExternal(url, options);

        const contacts = data.data || [];

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
