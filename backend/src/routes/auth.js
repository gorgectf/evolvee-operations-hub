const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const env = require('../config/env');
const { authenticate, ROLE_PERMISSIONS } = require('../middleware/auth');
const { asyncRoute } = require('../middleware/errorHandler');

const router = express.Router();

router.post('/login', asyncRoute(async (req, res) => {
    let body = req.body;
    if (!body) {
        body = {};
    }
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

    let permissions = ROLE_PERMISSIONS[user.role];
    if (!permissions) {
        permissions = [];
    }

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
    let permissions = ROLE_PERMISSIONS[req.user.role];
    if (!permissions) {
        permissions = [];
    }

    const user = {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        permissions: permissions
    };

    res.json({ user: user });
});

module.exports = router;