const express = require('express');
const crypto = require('crypto');
const env = require('../config/env');
const { asyncRoute } = require('../middleware/errorHandler');

const router = express.Router();

function isValidSignature(rawBody, signatureHeader, secret) {
    if (!signatureHeader || !secret) {
        return false;
    }
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(signatureHeader);
    if (expectedBuf.length !== receivedBuf.length) {
        return false;
    }
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

// AfterShip signs each webhook with HMAC-SHA256 (base64) of the raw body,
// sent in the `aftership-hmac-sha256` header. Docs: Settings > Notifications.
router.post('/aftership', asyncRoute(async (req, res) => {
    const signature = req.get('aftership-hmac-sha256');
    const valid = isValidSignature(req.rawBody, signature, env.aftership.webhookSecret);

    if (!valid) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    console.log('[webhook] aftership event:', req.body && req.body.msg && req.body.msg.tag);
    res.status(200).json({ ok: true });
}));

module.exports = router;
