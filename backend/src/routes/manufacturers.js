const express = require('express');
const { query } = require('../config/db');
const { authenticate, requirePermission } = require('../middleware/auth');
const { asyncRoute } = require('../middleware/errorHandler');

const router = express.Router();
router.use(authenticate, requirePermission('manufacturers'));

router.get('/', asyncRoute(async (req, res) => {
    const sql =
        'SELECT m.*, ' +
        '    (SELECT COUNT(*)::int FROM products p ' +
        '     WHERE p.manufacturer_id = m.id) AS product_count, ' +
        '    (SELECT COUNT(*)::int FROM production_runs pr ' +
        '     WHERE pr.manufacturer_id = m.id ' +
        "       AND pr.status IN ('ordered', 'in_production', 'shipped')) AS active_runs " +
        'FROM manufacturers m ' +
        'ORDER BY m.name';

    const result = await query(sql);
    res.json({ manufacturers: result.rows });
}));

router.get('/:id', asyncRoute(async (req, res) => {
    const id = Number(req.params.id);

    const mfr = await query(
        'SELECT * FROM manufacturers WHERE id = $1',
        [id]
    );

    if (!mfr.rows[0]) {
        return res.status(404).json({ error: 'Manufacturer not found.' });
    }

    const contacts = await query(
        'SELECT * FROM manufacturer_contacts WHERE manufacturer_id = $1 ORDER BY name',
        [id]
    );

    const productsSql =
        'SELECT p.*, rt.threshold ' +
        'FROM products p ' +
        'LEFT JOIN reorder_thresholds rt ON rt.product_id = p.id ' +
        'WHERE p.manufacturer_id = $1 ' +
        'ORDER BY p.sku';
    const products = await query(productsSql, [id]);

    const commsSql =
        'SELECT c.*, u.full_name AS logged_by_name, mc.name AS contact_name ' +
        'FROM communications c ' +
        'LEFT JOIN users u ON u.id = c.logged_by ' +
        'LEFT JOIN manufacturer_contacts mc ON mc.id = c.contact_id ' +
        'WHERE c.manufacturer_id = $1 ' +
        'ORDER BY c.logged_at DESC';
    const comms = await query(commsSql, [id]);

    const runsSql =
        'SELECT pr.*, p.sku, p.name AS product_name ' +
        'FROM production_runs pr ' +
        'LEFT JOIN products p ON p.id = pr.product_id ' +
        'WHERE pr.manufacturer_id = $1 ' +
        'ORDER BY pr.created_at DESC';
    const runs = await query(runsSql, [id]);

    const historySql =
        'SELECT rh.*, p.sku, p.name AS product_name ' +
        'FROM reorder_history rh ' +
        'JOIN products p ON p.id = rh.product_id ' +
        'WHERE rh.manufacturer_id = $1 ' +
        'ORDER BY rh.ordered_at DESC';
    const history = await query(historySql, [id]);

    res.json({
        manufacturer: mfr.rows[0],
        contacts: contacts.rows,
        products: products.rows,
        communications: comms.rows,
        production_runs: runs.rows,
        reorder_history: history.rows
    });
}));

router.post('/', asyncRoute(async (req, res) => {
    let body = req.body;
    if (!body) {
        body = {};
    }
    const name = body.name;
    const country = body.country;
    const notes = body.notes;

    if (!name) {
        return res.status(400).json({ error: 'Manufacturer name is required.' });
    }

    let countryValue = null;
    if (country) {
        countryValue = country;
    }

    let notesValue = null;
    if (notes) {
        notesValue = notes;
    }

    const result = await query(
        'INSERT INTO manufacturers (name, country, notes) VALUES ($1, $2, $3) RETURNING *',
        [name, countryValue, notesValue]
    );
    res.status(201).json({ manufacturer: result.rows[0] });
}));

router.patch('/:id', asyncRoute(async (req, res) => {
    let body = req.body;
    if (!body) {
        body = {};
    }

    let nameValue = null;
    if (body.name !== undefined && body.name !== null) {
        nameValue = body.name;
    }

    let countryValue = null;
    if (body.country !== undefined && body.country !== null) {
        countryValue = body.country;
    }

    let notesValue = null;
    if (body.notes !== undefined && body.notes !== null) {
        notesValue = body.notes;
    }

    const id = Number(req.params.id);
    const sql =
        'UPDATE manufacturers SET ' +
        '    name = COALESCE($1, name), ' +
        '    country = COALESCE($2, country), ' +
        '    notes = COALESCE($3, notes), ' +
        '    updated_at = NOW() ' +
        'WHERE id = $4 RETURNING *';

    const result = await query(sql, [nameValue, countryValue, notesValue, id]);

    if (!result.rows[0]) {
        return res.status(404).json({ error: 'Manufacturer not found.' });
    }
    res.json({ manufacturer: result.rows[0] });
}));

router.delete('/:id', asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    const result = await query('DELETE FROM manufacturers WHERE id = $1', [id]);
    if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Manufacturer not found.' });
    }
    res.json({ ok: true });
}));

router.post('/:id/contacts', asyncRoute(async (req, res) => {
    let body = req.body;
    if (!body) {
        body = {};
    }
    const name = body.name;
    const role = body.role;
    const email = body.email;
    const phone = body.phone;
    const notes = body.notes;

    if (!name) {
        return res.status(400).json({ error: 'Contact name is required.' });
    }

    let roleValue = null;
    if (role) {
        roleValue = role;
    }

    let emailValue = null;
    if (email) {
        emailValue = email;
    }

    let phoneValue = null;
    if (phone) {
        phoneValue = phone;
    }

    let notesValue = null;
    if (notes) {
        notesValue = notes;
    }

    const manufacturerId = Number(req.params.id);
    const sql =
        'INSERT INTO manufacturer_contacts ' +
        '    (manufacturer_id, name, role, email, phone, notes) ' +
        'VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';

    const result = await query(sql, [manufacturerId, name, roleValue, emailValue, phoneValue, notesValue]);
    res.status(201).json({ contact: result.rows[0] });
}));

router.delete('/contacts/:contactId', asyncRoute(async (req, res) => {
    const contactId = Number(req.params.contactId);
    await query('DELETE FROM manufacturer_contacts WHERE id = $1', [contactId]);
    res.json({ ok: true });
}));

router.post('/:id/communications', asyncRoute(async (req, res) => {
    let body = req.body;
    if (!body) {
        body = {};
    }
    const channel = body.channel;
    const summary = body.summary;
    const contactId = body.contact_id;

    if (!summary) {
        return res.status(400).json({ error: 'A summary of the communication is required.' });
    }

    let channelValue = 'email';
    if (channel) {
        channelValue = channel;
    }

    let contactIdValue = null;
    if (contactId) {
        contactIdValue = contactId;
    }

    const manufacturerId = Number(req.params.id);
    const sql =
        'INSERT INTO communications ' +
        '    (manufacturer_id, contact_id, channel, summary, logged_by) ' +
        'VALUES ($1, $2, $3, $4, $5) RETURNING *';

    const result = await query(sql, [manufacturerId, contactIdValue, channelValue, summary, req.user.id]);
    res.status(201).json({ communication: result.rows[0] });
}));

router.post('/:id/reorders', asyncRoute(async (req, res) => {
    let body = req.body;
    if (!body) {
        body = {};
    }
    const productId = body.product_id;
    const quantityOrdered = body.quantity_ordered;
    const orderedAt = body.ordered_at;
    const notes = body.notes;

    if (!productId || !quantityOrdered) {
        return res.status(400).json({ error: 'product_id and quantity_ordered are required.' });
    }

    let orderedAtValue = null;
    if (orderedAt) {
        orderedAtValue = orderedAt;
    }

    let notesValue = null;
    if (notes) {
        notesValue = notes;
    }

    const manufacturerId = Number(req.params.id);
    const sql =
        'INSERT INTO reorder_history ' +
        '    (product_id, manufacturer_id, quantity_ordered, ordered_at, notes, created_by) ' +
        'VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5, $6) RETURNING *';

    const result = await query(sql, [productId, manufacturerId, quantityOrdered, orderedAtValue, notesValue, req.user.id]);
    res.status(201).json({ reorder: result.rows[0] });
}));

module.exports = router;