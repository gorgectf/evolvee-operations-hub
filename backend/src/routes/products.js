const express = require('express');
const { query } = require('../config/db');
const { authenticate, requirePermission } = require('../middleware/auth');
const { asyncRoute } = require('../middleware/errorHandler');

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

router.post('/', asyncRoute(async (req, res) => {
    let body = req.body;
    if (!body) {
        body = {};
    }
    const sku = body.sku;
    const name = body.name;
    const manufacturerId = body.manufacturer_id;
    const threshold = body.threshold;

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

    let manufacturerIdValue = null;
    if (manufacturerId) {
        manufacturerIdValue = manufacturerId;
    }

    const insertProductSql =
        'INSERT INTO products (sku, name, manufacturer_id) ' +
        'VALUES ($1, $2, $3) RETURNING *';

    const productResult = await query(insertProductSql, [sku.trim(), name, manufacturerIdValue]);
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
    let body = req.body;
    if (!body) {
        body = {};
    }

    let manufacturerIdValue = null;
    if (body.manufacturer_id) {
        manufacturerIdValue = body.manufacturer_id;
    }

    const id = Number(req.params.id);
    const sql = 'UPDATE products SET manufacturer_id = $1 WHERE id = $2 RETURNING *';

    const result = await query(sql, [manufacturerIdValue, id]);

    if (!result.rows[0]) {
        return res.status(404).json({ error: 'Product not found.' });
    }
    res.json({ product: result.rows[0] });
}));

router.put('/:id/threshold', asyncRoute(async (req, res) => {
    let body = req.body;
    if (!body) {
        body = {};
    }

    const threshold = Number(body.threshold);
    if (!Number.isFinite(threshold) || threshold < 0) {
        return res.status(400).json({ error: 'threshold must be a number of 0 or more.' });
    }

    const productId = Number(req.params.id);
    const sql =
        'INSERT INTO reorder_thresholds (product_id, threshold) ' +
        'VALUES ($1, $2) ' +
        'ON CONFLICT (product_id) DO UPDATE ' +
        '    SET threshold = $2, updated_at = NOW() ' +
        'RETURNING *';

    const result = await query(sql, [productId, threshold]);
    res.json({ threshold: result.rows[0] });
}));

module.exports = router;