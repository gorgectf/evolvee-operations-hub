const env = require('../../config/env');
const { callExternal, recordSync } = require('../apiClient');
const { getZohoAccessToken } = require('./zohoAuth');
const sample = require('../sampleData/zohoCrm.json');

async function getCrmCustomers() {
    const mode = env.modes.zohoCrm;

    if (mode === 'off') {
        await recordSync('zoho_crm', 'off', true);
        return [];
    }

    try {
        let customers;

        if (mode === 'sample') {
            customers = sample.customers;
        } else {
            const token = await getZohoAccessToken();

            const url =
                env.zoho.apiBase + '/crm/v6/Contacts' +
                '?fields=Email,Lead_Source,Description' +
                '&per_page=200';

            const options = {
                headers: { Authorization: 'Zoho-oauthtoken ' + token }
            };
            const data = await callExternal(url, options);

            let contacts = [];
            if (data.data) {
                contacts = data.data;
            }

            customers = [];
            for (const c of contacts) {
                let segment = 'Unknown';
                if (c.Lead_Source) {
                    segment = c.Lead_Source;
                }

                let lifetimeNotes = '';
                if (c.Description) {
                    lifetimeNotes = c.Description;
                }

                customers.push({
                    crm_id: c.id,
                    email: c.Email,
                    segment: segment,
                    lifetime_notes: lifetimeNotes
                });
            }
        }

        await recordSync('zoho_crm', mode, true);
        return customers;
    } catch (err) {
        await recordSync('zoho_crm', mode, false, err.message);
        throw err;
    }
}

module.exports = { getCrmCustomers };