// Zoho Books — refreshes an access token, then reads one invoice.
const { http, mode, need, zohoToken, run } = require('./_runner.cjs');

async function test() {
    mode('ZOHO_BOOKS_MODE');
    need('ZOHO_ORG_ID');

    const token = await zohoToken();
    const base = process.env.ZOHO_API_BASE || 'https://www.zohoapis.com';
    const url = `${base}/books/v3/invoices?organization_id=${encodeURIComponent(process.env.ZOHO_ORG_ID)}&per_page=1`;
    const data = await http(url, { headers: { Authorization: 'Zoho-oauthtoken ' + token } });

    return `token OK, reached Books API (${(data.invoices || []).length} invoice sampled)`;
}

module.exports = { name: 'Zoho Books', test };
if (require.main === module) run([module.exports]);
