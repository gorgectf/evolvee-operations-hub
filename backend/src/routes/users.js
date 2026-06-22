const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { authenticate, requirePermission } = require('../middleware/auth');
const { asyncRoute } = require('../middleware/errorHandler');

const router = express.Router();
router.use(authenticate, requirePermission('users'));

const ROLES = ['admin', 'developer', 'ops_manager', 'marketing', 'partner'];

async function activeAdminCount() {
    const result = await query(
        "SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin' AND is_active = TRUE"
    );
    return result.rows[0].n;
}

router.get('/', asyncRoute(async (req, res) => {
    const sql = 'SELECT id, email, full_name, role, is_active, created_at FROM users ORDER BY id';
    const result = await query(sql);
    res.json({ users: result.rows });
}));

router.post('/', asyncRoute(async (req, res) => {
    let body = req.body;
    if (!body) {
        body = {};
    }
    const email = body.email;
    const password = body.password;
    const fullName = body.full_name;
    const role = body.role;

    if (!email || !password || !fullName || !ROLES.includes(role)) {
        const allowed = ROLES.join(', ');
        return res.status(400).json({
            error: 'email, password, full_name required; role must be one of: ' + allowed
        });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const normalisedEmail = email.toLowerCase().trim();

    const sql =
        'INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) ' +
        'ON CONFLICT (email) DO NOTHING ' +
        'RETURNING id, email, full_name, role';

    const result = await query(sql, [normalisedEmail, hash, fullName, role]);

    if (!result.rows[0]) {
        return res.status(409).json({ error: 'A user with that email already exists.' });
    }
    res.status(201).json({ user: result.rows[0] });
}));

router.patch('/:id', asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid user id.' });
    }

    const existingResult = await query(
        'SELECT id, email, full_name, role, is_active FROM users WHERE id = $1',
        [id]
    );
    const current = existingResult.rows[0];
    if (!current) {
        return res.status(404).json({ error: 'User not found.' });
    }

    let body = req.body;
    if (!body) {
        body = {};
    }
    const email = body.email;
    const fullName = body.full_name;
    const role = body.role;
    const isActive = body.is_active;
    const password = body.password;

    if (role !== undefined && !ROLES.includes(role)) {
        const allowed = ROLES.join(', ');
        return res.status(400).json({ error: 'role must be one of: ' + allowed });
    }

    if (password !== undefined && String(password).length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const removingAdminRole = role !== undefined && role !== 'admin' && current.role === 'admin';
    const deactivatingAdmin = isActive === false && current.role === 'admin' && current.is_active;

    if (removingAdminRole || deactivatingAdmin) {
        const admins = await activeAdminCount();
        if (admins <= 1) {
            return res.status(400).json({ error: 'This is the last active admin — promote another admin first.' });
        }
    }

    if (isActive === false && id === req.user.id) {
        return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    }

    if (fullName !== undefined) {
        await query('UPDATE users SET full_name = $1 WHERE id = $2', [fullName, id]);
    }

    if (email !== undefined) {
        const normalisedEmail = String(email).toLowerCase().trim();
        const clash = await query(
            'SELECT 1 FROM users WHERE email = $1 AND id <> $2',
            [normalisedEmail, id]
        );
        if (clash.rows[0]) {
            return res.status(409).json({ error: 'Another user already has that email.' });
        }
        await query('UPDATE users SET email = $1 WHERE id = $2', [normalisedEmail, id]);
    }

    if (role !== undefined) {
        await query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
    }

    if (isActive !== undefined) {
        const activeFlag = Boolean(isActive);
        await query('UPDATE users SET is_active = $1 WHERE id = $2', [activeFlag, id]);
    }

    if (password !== undefined) {
        const newHash = bcrypt.hashSync(password, 10);
        await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, id]);
    }

    const updated = await query(
        'SELECT id, email, full_name, role, is_active FROM users WHERE id = $1',
        [id]
    );
    res.json({ user: updated.rows[0] });
}));

router.delete('/:id', asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid user id.' });
    }

    if (id === req.user.id) {
        return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const existingResult = await query(
        'SELECT id, role, is_active FROM users WHERE id = $1',
        [id]
    );
    const current = existingResult.rows[0];
    if (!current) {
        return res.status(404).json({ error: 'User not found.' });
    }

    if (current.role === 'admin' && current.is_active) {
        const admins = await activeAdminCount();
        if (admins <= 1) {
            return res.status(400).json({ error: 'This is the last active admin — promote another admin first.' });
        }
    }

    await query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ deleted: true, id: id });
}));

module.exports = router;