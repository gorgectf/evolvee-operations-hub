const env = require('../../config/env');
const { callExternal, recordSync } = require('../apiClient');
const sample = require('../sampleData/shopify.json');

function headers() {
    return {
        'X-Shopify-Access-Token': env.shopify.adminToken,
        'Content-Type': 'application/json'
    };
}

function base() {
    return 'https://' + env.shopify.storeDomain + '/admin/api/' + env.shopify.apiVersion;
}

function nextPageUrl(linkHeader) {
    if (!linkHeader) {
        return null;
    }

    for (const part of linkHeader.split(',')) {
        const match = part.match(/<([^>]+)>;\s*rel="next"/);
        if (match) {
            return match[1];
        }
    }

    return null;
}

async function fetchAllPages(firstUrl, key) {
    const out = [];
    let next = firstUrl;

    while (next) {
        const result = await callExternal(next, { headers: headers() }, { includeHeaders: true });

        for (const item of (result.data[key] || [])) {
            out.push(item);
        }

        next = nextPageUrl(result.headers.get('link'));
    }

    return out;
}

async function getSalesOverview() {
    const mode = env.modes.shopify;

    if (mode === 'off') {
        await recordSync('shopify', 'off', true);
        return [];
    }

    try {
        let products;

        if (mode === 'sample') {
            products = sample.products;
        } else {
            const thirtyDaysMs = 30 * 864e5;
            const since = new Date(Date.now() - thirtyDaysMs).toISOString();

            const url =
                base() +
                '/orders.json?status=any' +
                '&created_at_min=' + since +
                '&limit=250' +
                '&fields=line_items,total_price';

            const data = await callExternal(url, { headers: headers() });

            const orders = data.orders || [];

            const bySku = {};
            for (const order of orders) {
                const lineItems = order.line_items || [];

                for (const li of lineItems) {
                    const sku = li.sku || li.title;

                    if (!bySku[sku]) {
                        bySku[sku] = {
                            sku: sku,
                            title: li.title,
                            units_sold_30d: 0,
                            revenue_30d: 0
                        };
                    }

                    bySku[sku].units_sold_30d += li.quantity;
                    bySku[sku].revenue_30d += Number(li.price) * li.quantity;
                }
            }

            products = Object.values(bySku);
        }

        await recordSync('shopify', mode, true);
        return products;
    } catch (err) {
        await recordSync('shopify', mode, false, err.message);
        throw err;
    }
}

async function getTopCustomers() {
    const mode = env.modes.shopify;

    if (mode === 'off') {
        await recordSync('shopify', 'off', true);
        return [];
    }

    try {
        let customers;

        if (mode === 'sample') {
            customers = sample.customers;
        } else {
            const url = base() + '/customers.json?limit=50&order=total_spent+desc';
            const data = await callExternal(url, { headers: headers() });

            const rawCustomers = data.customers || [];

            customers = [];
            for (const c of rawCustomers) {
                const name = ((c.first_name || '') + ' ' + (c.last_name || '')).trim();

                customers.push({
                    id: String(c.id),
                    name: name,
                    email: c.email,
                    orders_count: c.orders_count,
                    total_spent: Number(c.total_spent)
                });
            }
        }

        await recordSync('shopify', mode, true);
        return customers;
    } catch (err) {
        await recordSync('shopify', mode, false, err.message);
        throw err;
    }
}

async function getDailyRevenue() {
    const mode = env.modes.shopify;

    if (mode === 'off') {
        await recordSync('shopify', 'off', true);
        return [];
    }

    try {
        let daily;

        if (mode === 'sample') {
            daily = sample.revenue_daily;
        } else {
            const thirtyOneDaysMs = 31 * 864e5;
            const since = new Date(Date.now() - thirtyOneDaysMs).toISOString();

            const url =
                base() +
                '/orders.json?status=any' +
                '&created_at_min=' + since +
                '&limit=250' +
                '&fields=created_at,total_price';

            const data = await callExternal(url, { headers: headers() });

            const orders = data.orders || [];

            const byDay = {};
            for (const o of orders) {
                const d = o.created_at.slice(0, 10);
                byDay[d] = (byDay[d] || 0) + Number(o.total_price);
            }

            const dayKeys = Object.keys(byDay);
            dayKeys.sort();

            daily = [];
            for (const date of dayKeys) {
                daily.push({
                    date: date,
                    revenue: byDay[date]
                });
            }
        }

        await recordSync('shopify', mode, true);
        return daily;
    } catch (err) {
        await recordSync('shopify', mode, false, err.message);
        throw err;
    }
}

async function getStockLevels() {
    const mode = env.modes.shopify;

    if (mode === 'off') {
        await recordSync('shopify', 'off', true);
        return [];
    }

    try {
        let items;

        if (mode === 'sample') {
            items = sample.inventory;
        } else {
            const products = await fetchAllPages(
                base() + '/products.json?limit=250&fields=title,variants',
                'products'
            );

            const bySku = {};
            const itemToSku = {};
            for (const p of products) {
                for (const v of (p.variants || [])) {
                    const sku = v.sku || (v.inventory_item_id ? String(v.inventory_item_id) : null);
                    if (!sku) {
                        continue;
                    }

                    const variantName = v.title && v.title !== 'Default Title'
                        ? p.title + ' - ' + v.title
                        : p.title;

                    bySku[sku] = {
                        sku: sku,
                        inventory_item_id: v.inventory_item_id ? String(v.inventory_item_id) : null,
                        name: variantName,
                        stock_on_hand: 0,
                        reorder_level: 0
                    };

                    if (v.inventory_item_id) {
                        itemToSku[v.inventory_item_id] = sku;
                    }
                }
            }

            const itemIds = Object.keys(itemToSku);
            for (let i = 0; i < itemIds.length; i += 50) {
                const chunk = itemIds.slice(i, i + 50);

                const levelsUrl =
                    base() +
                    '/inventory_levels.json?inventory_item_ids=' + chunk.join(',') +
                    '&limit=250';

                const levels = await fetchAllPages(levelsUrl, 'inventory_levels');

                for (const lvl of levels) {
                    const sku = itemToSku[lvl.inventory_item_id];
                    if (sku && bySku[sku]) {
                        bySku[sku].stock_on_hand += Number(lvl.available || 0);
                    }
                }
            }

            items = Object.values(bySku);
        }

        await recordSync('shopify', mode, true);
        return items;
    } catch (err) {
        await recordSync('shopify', mode, false, err.message);
        throw err;
    }
}

async function getMonthlyRevenue() {
    const mode = env.modes.shopify;

    if (mode === 'off') {
        await recordSync('shopify', 'off', true);
        return [];
    }

    try {
        let months;

        if (mode === 'sample') {
            months = sample.revenue_monthly;
        } else {
            const yearMs = 365 * 864e5;
            const since = new Date(Date.now() - yearMs).toISOString();

            const url =
                base() +
                '/orders.json?status=any' +
                '&financial_status=paid' +
                '&created_at_min=' + since +
                '&limit=250' +
                '&fields=created_at,total_price';

            const orders = await fetchAllPages(url, 'orders');

            const byMonth = {};
            for (const o of orders) {
                const m = o.created_at.slice(0, 7);
                byMonth[m] = (byMonth[m] || 0) + Number(o.total_price);
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

        await recordSync('shopify', mode, true);
        return months;
    } catch (err) {
        await recordSync('shopify', mode, false, err.message);
        throw err;
    }
}

module.exports = { getSalesOverview, getTopCustomers, getDailyRevenue, getStockLevels, getMonthlyRevenue };