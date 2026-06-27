require('dotenv').config();

const DOMAIN  = process.env.SHOPIFY_STORE_DOMAIN;
const TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || '2025-04';
const MODE    = process.env.SHOPIFY_MODE || 'sample';

function base() {
    return 'https://' + DOMAIN + '/admin/api/' + VERSION;
}

function headers() {
    return { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };
}

async function get(url) {
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) {
        throw new Error(res.status + ' ' + res.statusText + ' — ' + url);
    }
    return res.json();
}

async function run() {
    if (MODE !== 'live') {
        console.log('SHOPIFY_MODE=' + MODE + ' — set SHOPIFY_MODE=live in .env to hit the real API');
        return;
    }
    if (!DOMAIN || !TOKEN || DOMAIN.includes('your-store') || TOKEN.includes('xxx')) {
        console.error('Missing/placeholder SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_TOKEN in .env');
        process.exit(1);
    }

    const since30  = new Date(Date.now() - 30  * 864e5).toISOString();
    const since365 = new Date(Date.now() - 365 * 864e5).toISOString();

    console.log('=== Sales overview (orders last 30d) ===');
    const ordersData  = await get(base() + '/orders.json?status=any&created_at_min=' + since30 + '&limit=5&fields=line_items,total_price');
    const orderCount  = ordersData.orders ? ordersData.orders.length : 0;
    console.log('  ' + orderCount + ' orders returned (limit 5)');
    if (ordersData.orders && ordersData.orders[0]) {
        const firstOrder    = ordersData.orders[0];
        const firstLineItem = firstOrder.line_items && firstOrder.line_items[0] ? firstOrder.line_items[0] : null;
        if (firstLineItem) {
            console.log('  First line item sample:', { sku: firstLineItem.sku, title: firstLineItem.title, qty: firstLineItem.quantity, price: firstLineItem.price });
        } else {
            console.log('  First line item sample: none');
        }
    }

    console.log('\n=== Top customers ===');
    const custData  = await get(base() + '/customers.json?limit=5&order=total_spent+desc');
    const customers = custData.customers || [];
    for (let i = 0; i < 3 && i < customers.length; i++) {
        const customer = customers[i];
        console.log('  ' + customer.first_name + ' ' + customer.last_name + ' — ' + customer.orders_count + ' orders — $' + customer.total_spent);
    }

    console.log('\n=== Daily revenue (orders last 31d) ===');
    const dailyData   = await get(base() + '/orders.json?status=any&created_at_min=' + since30 + '&limit=5&fields=created_at,total_price');
    const dailyOrders = dailyData.orders || [];
    for (let i = 0; i < 3 && i < dailyOrders.length; i++) {
        const order = dailyOrders[i];
        console.log('  ' + order.created_at.slice(0, 10) + ' — $' + order.total_price);
    }

    console.log('\n=== Stock levels (products) ===');
    const prodData = await get(base() + '/products.json?limit=5&fields=title,variants');
    const products = prodData.products || [];
    for (let i = 0; i < 3 && i < products.length; i++) {
        const product      = products[i];
        const firstVariant = product.variants && product.variants[0] ? product.variants[0] : null;
        const sku          = firstVariant && firstVariant.sku ? firstVariant.sku : '(none)';
        const inventoryId  = firstVariant ? firstVariant.inventory_item_id : '';
        console.log('  ' + product.title + ' — SKU: ' + sku + ' — inventory_item_id: ' + inventoryId);
    }

    console.log('\n=== Monthly revenue (orders last 365d, paid) ===');
    const monthData   = await get(base() + '/orders.json?status=any&financial_status=paid&created_at_min=' + since365 + '&limit=5&fields=created_at,total_price');
    const monthOrders = monthData.orders || [];
    const byMonth     = {};
    for (let i = 0; i < monthOrders.length; i++) {
        const order = monthOrders[i];
        const month = order.created_at.slice(0, 7);
        if (!byMonth[month]) {
            byMonth[month] = 0;
        }
        byMonth[month] = byMonth[month] + Number(order.total_price);
    }
    const sortedMonths = Object.keys(byMonth).sort();
    for (let i = 0; i < sortedMonths.length; i++) {
        const month = sortedMonths[i];
        console.log('  ' + month + ' — $' + byMonth[month].toFixed(2));
    }

    console.log('\nDone.');
}

run().catch(function(err) {
    console.error(err.message);
    process.exit(1);
});