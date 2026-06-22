const env = require('../../config/env');
const { callExternal, recordSync } = require('../apiClient');
const { getZohoAccessToken } = require('./zohoAuth');
const sample = require('../sampleData/zohoInventory.json');

async function getStockLevels() {
    const mode = env.modes.zohoInventory;

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

            let rawItems = [];
            if (data.items) {
                rawItems = data.items;
            }

            items = [];
            for (const i of rawItems) {
                let stockValue = 0;
                if (i.stock_on_hand !== undefined && i.stock_on_hand !== null) {
                    stockValue = i.stock_on_hand;
                } else if (i.available_stock !== undefined && i.available_stock !== null) {
                    stockValue = i.available_stock;
                }

                let reorderValue = 0;
                if (i.reorder_level !== undefined && i.reorder_level !== null) {
                    reorderValue = i.reorder_level;
                }

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