const express = require('express');
const { query } = require('../config/db');
const { authenticate, requirePermission } = require('../middleware/auth');
const { asyncRoute } = require('../middleware/errorHandler');
const shopify = require('../services/integrations/shopify');
const shopifyReviews = require('../services/integrations/shopifyReviews');
const { computeProductMetrics } = require('../services/productMetrics');

const router = express.Router();
router.use(authenticate, requirePermission('manufacturers'));

router.get('/', asyncRoute(async (req, res) => {
    const sql =
        'SELECT p.*, m.name AS manufacturer_name, rt.threshold ' +
        'FROM products p ' +
        'LEFT JOIN manufacturers m ON m.id = p.manufacturer_id ' +
        'LEFT JOIN reorder_thresholds rt ON rt.product_id = p.id ' +
        'ORDER BY p.sku';

    const result = await query(sql);
    res.json({ products: result.rows });
}));

router.get('/:id', asyncRoute(async (req, res) => {
    const id = Number(req.params.id);

    const productResult = await query(
        'SELECT p.*, m.name AS manufacturer_name, rt.threshold ' +
        'FROM products p ' +
        'LEFT JOIN manufacturers m ON m.id = p.manufacturer_id ' +
        'LEFT JOIN reorder_thresholds rt ON rt.product_id = p.id ' +
        'WHERE p.id = $1',
        [id]
    );

    const product = productResult.rows[0];
    if (!product) {
        return res.status(404).json({ error: 'Product not found.' });
    }

    const [stock, sales, trend, reviews, reorderHistory, productionRuns] = await Promise.all([
        shopify.getStockLevels(),
        shopify.getSalesOverview(),
        shopify.getSalesTrend(),
        shopifyReviews.getReviews(),
        query(
            'SELECT rh.*, m.name AS manufacturer_name FROM reorder_history rh ' +
            'LEFT JOIN manufacturers m ON m.id = rh.manufacturer_id ' +
            'WHERE rh.product_id = $1 ORDER BY rh.ordered_at DESC',
            [id]
        ),
        query(
            'SELECT pr.*, m.name AS manufacturer_name FROM production_runs pr ' +
            'LEFT JOIN manufacturers m ON m.id = pr.manufacturer_id ' +
            'WHERE pr.product_id = $1 ORDER BY pr.created_at DESC',
            [id]
        )
    ]);

    const stockRow = stock.find((s) =>
        (product.shopify_inventory_item_id && s.inventory_item_id === product.shopify_inventory_item_id) ||
        s.sku === product.sku
    ) || null;

    const saleRow = sales.find((s) => s.sku === product.sku) ||
        { sku: product.sku, title: product.name, units_sold_30d: 0, revenue_30d: 0 };

    const cost = product.unit_cost != null ? Number(product.unit_cost) : null;
    const metrics = computeProductMetrics(saleRow, stockRow, cost);

    res.json({
        product: product,
        photo: stockRow ? (stockRow.image || null) : null,
        retail_price: stockRow ? stockRow.price : null,
        current_inventory: stockRow ? stockRow.stock_on_hand : null,
        metrics: metrics,
        trend: trend[product.sku] || [],
        reviews: reviews.filter((r) => r.sku === product.sku),
        reorder_history: reorderHistory.rows,
        production_runs: productionRuns.rows
    });
}));

router.post('/sync-shopify', asyncRoute(async (req, res) => {
    const stock = await shopify.getStockLevels();

    let added = 0;
    for (const item of stock) {
        const result = await query(
            'INSERT INTO products (sku, name, shopify_inventory_item_id) ' +
            'VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [item.sku, item.name, item.inventory_item_id || null]
        );
        added += result.rowCount;
    }

    res.json({ added: added, total: stock.length });
}));

router.post('/', asyncRoute(async (req, res) => {
    const body = req.body || {};
    const sku = body.sku;
    const name = body.name;
    const manufacturerId = body.manufacturer_id;
    const threshold = body.threshold;
    const unitCost = body.unit_cost;

    if (!sku || !name) {
        return res.status(400).json({ error: 'sku and name are required.' });
    }

    let thresholdValue = null;
    if (threshold !== undefined && threshold !== null && threshold !== '') {
        const n = Number(threshold);
        if (!Number.isFinite(n) || n < 0) {
            return res.status(400).json({ error: 'threshold must be a number of 0 or more.' });
        }
        thresholdValue = n;
    }

    let unitCostValue = null;
    if (unitCost !== undefined && unitCost !== null && unitCost !== '') {
        const c = Number(unitCost);
        if (!Number.isFinite(c) || c < 0) {
            return res.status(400).json({ error: 'unit_cost must be a number of 0 or more.' });
        }
        unitCostValue = c;
    }

    const manufacturerIdValue = manufacturerId || null;

    const insertProductSql =
        'INSERT INTO products (sku, name, manufacturer_id, unit_cost) ' +
        'VALUES ($1, $2, $3, $4) RETURNING *';

    const productResult = await query(insertProductSql, [sku.trim(), name, manufacturerIdValue, unitCostValue]);
    const product = productResult.rows[0];

    if (thresholdValue !== null) {
        const thresholdSql =
            'INSERT INTO reorder_thresholds (product_id, threshold) ' +
            'VALUES ($1, $2) ' +
            'ON CONFLICT (product_id) DO UPDATE ' +
            '    SET threshold = $2, updated_at = NOW()';

        await query(thresholdSql, [product.id, thresholdValue]);
    }

    res.status(201).json({ product: product });
}));

router.patch('/:id/manufacturer', asyncRoute(async (req, res) => {
    const body = req.body || {};

    const manufacturerIdValue = body.manufacturer_id || null;

    const id = Number(req.params.id);
    const sql = 'UPDATE products SET manufacturer_id = $1 WHERE id = $2 RETURNING *';

    const result = await query(sql, [manufacturerIdValue, id]);

    if (!result.rows[0]) {
        return res.status(404).json({ error: 'Product not found.' });
    }
    res.json({ product: result.rows[0] });
}));

router.put('/:id/threshold', asyncRoute(async (req, res) => {
    const body = req.body || {};

    const threshold = Number(body.threshold);
    if (!Number.isFinite(threshold) || threshold < 0) {
        return res.status(400).json({ error: 'threshold must be a number of 0 or more.' });
    }

    const productId = Number(req.params.id);
    // Upsert: one threshold row per product.
    const sql =
        'INSERT INTO reorder_thresholds (product_id, threshold) ' +
        'VALUES ($1, $2) ' +
        'ON CONFLICT (product_id) DO UPDATE ' +
        '    SET threshold = $2, updated_at = NOW() ' +
        'RETURNING *';

    const result = await query(sql, [productId, threshold]);
    res.json({ threshold: result.rows[0] });
}));

router.put('/:id/cost', asyncRoute(async (req, res) => {
    const body = req.body || {};

    const unitCost = Number(body.unit_cost);
    if (!Number.isFinite(unitCost) || unitCost < 0) {
        return res.status(400).json({ error: 'unit_cost must be a number of 0 or more.' });
    }

    const id = Number(req.params.id);
    const result = await query(
        'UPDATE products SET unit_cost = $1 WHERE id = $2 RETURNING *',
        [unitCost, id]
    );

    if (!result.rows[0]) {
        return res.status(404).json({ error: 'Product not found.' });
    }
    res.json({ product: result.rows[0] });
}));

module.exports = router;