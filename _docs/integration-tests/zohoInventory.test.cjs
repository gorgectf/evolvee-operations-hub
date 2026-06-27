// Zoho Inventory — refreshes an access token, then reads one item.
const { http, mode, need, zohoToken, run } = require('./_runner.cjs');

async function test() {
    mode('ZOHO_INVENTORY_MODE');
    need('ZOHO_ORG_ID');

    const token = await zohoToken();
    const base = process.env.ZOHO_API_BASE || 'https://www.zohoapis.com';
    const url = `${base}/inventory/v1/items?organization_id=${encodeURIComponent(process.env.ZOHO_ORG_ID)}&per_page=1`;
    const data = await http(url, { headers: { Authorization: 'Zoho-oauthtoken ' + token } });

    return `token OK, reached Inventory API (${(data.items || []).length} item sampled)`;
}

module.exports = { name: 'Zoho Inventory', test };
if (require.main === module) run([module.exports]);
