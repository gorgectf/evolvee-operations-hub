// Shopify — checks the Admin API credentials by reading one order (read_orders).
const { http, mode, need, run } = require('./_runner.cjs');

async function test() {
    mode('SHOPIFY_MODE');
    need('SHOPIFY_STORE_DOMAIN', 'SHOPIFY_ADMIN_TOKEN');

    const version = process.env.SHOPIFY_API_VERSION || '2025-04';
    const url = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/${version}/orders.json?status=any&limit=1`;
    const data = await http(url, { headers: { 'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN } });

    return `reached Orders API (${(data.orders || []).length} order sampled)`;
}

module.exports = { name: 'Shopify', test };
if (require.main === module) run([module.exports]);
