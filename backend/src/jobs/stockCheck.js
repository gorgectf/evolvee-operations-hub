const cron = require('node-cron');
const { query } = require('../config/db');
const env = require('../config/env');
const zohoInventory = require('../services/integrations/zohoInventory');

async function alertIfLowStock(productId, currentStock, threshold) {
    const existingAlert = await query(
        `SELECT id FROM reorder_alerts WHERE product_id = $1 AND status = 'open'`,
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
    const stockLevels = await zohoInventory.getStockLevels();

    const stockBySku = {};
    for (const stockItem of stockLevels) {
        stockBySku[stockItem.sku] = stockItem.stock_on_hand;
    }

    const thresholdsResult = await query(
        `SELECT p.id AS product_id, p.sku, rt.threshold
         FROM reorder_thresholds rt JOIN products p ON p.id = rt.product_id`
    );

    const thresholds = thresholdsResult.rows;
    let alertsCreated = 0;

    for (const row of thresholds) {
        const currentStock = stockBySku[row.sku];

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