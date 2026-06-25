const express = require('express');
const { query } = require('../config/db');
const { authenticate, requirePermission } = require('../middleware/auth');
const { asyncRoute } = require('../middleware/errorHandler');

const router = express.Router();
router.use(authenticate, requirePermission('manufacturers'));

const STATUSES = ['ordered', 'in_production', 'shipped', 'received', 'cancelled'];

router.get('/', asyncRoute(async (req, res) => {
    const sql =
        'SELECT pr.*, m.name AS manufacturer_name, p.sku, p.name AS product_name ' +
        'FROM production_runs pr ' +
        'JOIN manufacturers m ON m.id = pr.manufacturer_id ' +
        'LEFT JOIN products p ON p.id = pr.product_id ' +
        'ORDER BY pr.created_at DESC';

    const result = await query(sql);
    res.json({ runs: result.rows });
}));

router.post('/', asyncRoute(async (req, res) => {
    const body = req.body || {};
    const manufacturerId = body.manufacturer_id;
    const productId = body.product_id;
    const quantity = body.quantity;
    const status = body.status;
    const expectedDate = body.expected_date;
    const notes = body.notes;

    if (!manufacturerId) {
        return res.status(400).json({ error: 'manufacturer_id is required.' });
    }

    if (status && !STATUSES.includes(status)) {
        const allowed = STATUSES.join(', ');
        return res.status(400).json({ error: 'status must be one of: ' + allowed });
    }

    const productIdValue = productId || null;
    const quantityValue = quantity || null;
    const statusValue = status || null;
    const expectedDateValue = expectedDate || null;
    const notesValue = notes || null;

    const sql =
        'INSERT INTO production_runs ' +
        '    (manufacturer_id, product_id, quantity, status, expected_date, notes) ' +
        "VALUES ($1, $2, $3, COALESCE($4, 'ordered'), $5, $6) RETURNING *";

    const result = await query(sql, [
        manufacturerId,
        productIdValue,
        quantityValue,
        statusValue,
        expectedDateValue,
        notesValue
    ]);
    res.status(201).json({ run: result.rows[0] });
}));

router.patch('/:id', asyncRoute(async (req, res) => {
    const body = req.body || {};
    const status = body.status;
    const expectedDate = body.expected_date;
    const notes = body.notes;
    const quantity = body.quantity;

    if (status && !STATUSES.includes(status)) {
        const allowed = STATUSES.join(', ');
        return res.status(400).json({ error: 'status must be one of: ' + allowed });
    }

    const statusValue = status ?? null;
    const expectedDateValue = expectedDate ?? null;
    const notesValue = notes ?? null;
    const quantityValue = quantity ?? null;

    const id = Number(req.params.id);
    const sql =
        'UPDATE production_runs SET ' +
        '    status = COALESCE($1, status), ' +
        '    expected_date = COALESCE($2, expected_date), ' +
        '    notes = COALESCE($3, notes), ' +
        '    quantity = COALESCE($4, quantity), ' +
        '    updated_at = NOW() ' +
        'WHERE id = $5 RETURNING *';

    const result = await query(sql, [statusValue, expectedDateValue, notesValue, quantityValue, id]);

    if (!result.rows[0]) {
        return res.status(404).json({ error: 'Production run not found.' });
    }
    res.json({ run: result.rows[0] });
}));

module.exports = router;