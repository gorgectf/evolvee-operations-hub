const env = require('../../config/env');
const { callExternal, recordSync } = require('../apiClient');
const { getZohoAccessToken } = require('./zohoAuth');
const sample = require('../sampleData/zohoInventory.json');

async function getStockLevels() {
    const mode = env.modes.zohoInventory;

    if (mode === 'off') {
        await recordSync('zoho_inventory', 'off', true);
        return [];
    }

    try {
        let items;

        if (mode === 'sample') {
            items = sample.items;
        } else {
            const token = await getZohoAccessToken();

            const url =
                env.zoho.apiBase + '/inventory/v1/items' +
                '?organization_id=' + env.zoho.orgId;

            const options = {
                headers: { Authorization: 'Zoho-oauthtoken ' + token }
            };
            const data = await callExternal(url, options);

            const rawItems = data.items || [];

            items = [];
            for (const i of rawItems) {
                const stockValue = i.stock_on_hand ?? i.available_stock ?? 0;
                const reorderValue = i.reorder_level ?? 0;

                items.push({
                    sku: i.sku,
                    name: i.name,
                    stock_on_hand: Number(stockValue),
                    reorder_level: Number(reorderValue)
                });
            }
        }

        await recordSync('zoho_inventory', mode, true);
        return items;
    } catch (err) {
        await recordSync('zoho_inventory', mode, false, err.message);
        throw err;
    }
}

module.exports = { getStockLevels };