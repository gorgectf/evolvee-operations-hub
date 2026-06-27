// Zoho CRM — refreshes an access token, then reads one contact.
// (CRM returns an empty 204 when there are no contacts; that still proves access.)
const { http, mode, need, zohoToken, run } = require('./_runner.cjs');

async function test() {
    mode('ZOHO_CRM_MODE');

    const token = await zohoToken();
    const base = process.env.ZOHO_API_BASE || 'https://www.zohoapis.com';
    const url = `${base}/crm/v6/Contacts?fields=Email&per_page=1`;
    const data = await http(url, { headers: { Authorization: 'Zoho-oauthtoken ' + token } });

    return `token OK, reached CRM API (${(data.data || []).length} contact sampled)`;
}

module.exports = { name: 'Zoho CRM', test };
if (require.main === module) run([module.exports]);
