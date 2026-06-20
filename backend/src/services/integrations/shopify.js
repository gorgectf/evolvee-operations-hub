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

async function getSalesOverview() {
    const mode = env.modes.shopify;

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

            let orders = [];
            if (data.orders) {
                orders = data.orders;
            }

            const bySku = {};
            for (const order of orders) {
                let lineItems = [];
                if (order.line_items) {
                    lineItems = order.line_items;
                }

                for (const li of lineItems) {
                    let sku = li.sku;
                    if (!sku) {
                        sku = li.title;
                    }

                    if (!bySku[sku]) {
                        bySku[sku] = {
                            sku: sku,
                            title: li.title,
                            units_sold_30d: 0,
                            revenue_30d: 0
                        };
                    }

                    bySku[sku].units_sold_30d = bySku[sku].units_sold_30d + li.quantity;
                    bySku[sku].revenue_30d = bySku[sku].revenue_30d + (Number(li.price) * li.quantity);
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

    try {
        let customers;

        if (mode === 'sample') {
            customers = sample.customers;
        } else {
            const url = base() + '/customers.json?limit=50&order=total_spent+desc';
            const data = await callExternal(url, { headers: headers() });

            let rawCustomers = [];
            if (data.customers) {
                rawCustomers = data.customers;
            }

            customers = [];
            for (const c of rawCustomers) {
                let firstName = '';
                if (c.first_name) {
                    firstName = c.first_name;
                }

                let lastName = '';
                if (c.last_name) {
                    lastName = c.last_name;
                }

                const name = (firstName + ' ' + lastName).trim();

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

            let orders = [];
            if (data.orders) {
                orders = data.orders;
            }

            const byDay = {};
            for (const o of orders) {
                const d = o.created_at.slice(0, 10);
                if (byDay[d] === undefined) {
                    byDay[d] = 0;
                }
                byDay[d] = byDay[d] + Number(o.total_price);
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

module.exports = { getSalesOverview, getTopCustomers, getDailyRevenue };