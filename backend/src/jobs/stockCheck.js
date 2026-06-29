const cron = require('node-cron');
const { query } = require('../config/db');
const env = require('../config/env');
const shopify = require('../services/integrations/shopify');

// Skip if an open or acknowledged alert already exists for this product.
async function alertIfLowStock(productId, currentStock, threshold) {
    const existingAlert = await query(
        `SELECT id FROM reorder_alerts WHERE product_id = $1 AND status IN ('open', 'acknowledged')`,
        [productId]
    );

    if (existingAlert.rows.length > 0) {
        return false;
    }

    await query(
        `INSERT INTO reorder_alerts (product_id, stock_level, threshold) VALUES ($1, $2, $3)`,
        [productId, currentStock, threshold]
    );

    return true;
}

async function runStockCheck() {
    const stockLevels = await shopify.getStockLevels();

    // Index stock by item id and SKU so either can match a threshold row.
    const stockByKey = {};
    for (const stockItem of stockLevels) {
        if (stockItem.inventory_item_id != null) {
            stockByKey[stockItem.inventory_item_id] = stockItem.stock_on_hand;
        }
        if (stockItem.sku) {
            stockByKey[stockItem.sku] = stockItem.stock_on_hand;
        }
    }

    const thresholdsResult = await query(
        `SELECT p.id AS product_id, p.sku, p.shopify_inventory_item_id, rt.threshold
         FROM reorder_thresholds rt JOIN products p ON p.id = rt.product_id`
    );

    const thresholds = thresholdsResult.rows;
    let alertsCreated = 0;

    for (const row of thresholds) {
        // Match on item id first, then fall back to SKU.
        let currentStock = row.shopify_inventory_item_id != null
            ? stockByKey[row.shopify_inventory_item_id]
            : undefined;
        if (currentStock === undefined) {
            currentStock = stockByKey[row.sku];
        }

        if (currentStock === undefined) {
            continue;
        }

        if (currentStock <= row.threshold) {
            const wasCreated = await alertIfLowStock(row.product_id, currentStock, row.threshold);
            if (wasCreated) {
                alertsCreated++;
            }
        }
    }

    const summary = {
        checked: thresholds.length,
        alerts_created: alertsCreated,
        ran_at: new Date().toISOString()
    };

    console.log(`[stock-check] checked ${summary.checked} SKUs, created ${alertsCreated} new alert(s)`);
    return summary;
}

function scheduleStockCheck() {
    cron.schedule(env.stockCheckCron, function runScheduledStockCheck() {
        runStockCheck().catch(function handleStockCheckError(err) {
            console.error('[stock-check] failed:', err.message);
        });
    });

    console.log(`Stock check scheduled with cron pattern "${env.stockCheckCron}"`);
}

module.exports = { runStockCheck, scheduleStockCheck };