const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const env = require('../config/env');
const { authenticate, ROLE_PERMISSIONS } = require('../middleware/auth');
const { asyncRoute } = require('../middleware/errorHandler');

const router = express.Router();

router.post('/login', asyncRoute(async (req, res) => {
    const body = req.body || {};
    const email = body.email;
    const password = body.password;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalisedEmail = email.toLowerCase().trim();
    const result = await query(
        'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
        [normalisedEmail]
    );

    // Same message for unknown email and wrong password.
    const user = result.rows[0];
    if (!user) {
        return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    const passwordMatches = bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatches) {
        return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.full_name
    };
    const tokenOptions = { expiresIn: env.jwtExpiresIn };
    const token = jwt.sign(tokenPayload, env.jwtSecret, tokenOptions);

    const permissions = ROLE_PERMISSIONS[user.role] || [];

    res.json({
        token: token,
        user: {
            id: user.id,
            email: user.email,
            name: user.full_name,
            role: user.role,
            permissions: permissions
        }
    });
}));

router.get('/me', authenticate, (req, res) => {
    const permissions = ROLE_PERMISSIONS[req.user.role] || [];

    const user = {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        permissions: permissions
    };

    res.json({ user: user });
});

router.post('/password', authenticate, asyncRoute(async (req, res) => {
    const body = req.body || {};
    const currentPassword = body.current_password;
    const newPassword = body.new_password;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password are required.' });
    }
    if (String(newPassword).length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }
    
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);
    res.json({ ok: true });
}));

module.exports = router;