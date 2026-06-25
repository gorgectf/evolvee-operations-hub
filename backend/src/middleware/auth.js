const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Permission model:
//   admin        - everything, including user management
//   developer    - everything except user management
//   ops_manager  - operations modules + manufacturer tool (revenue visibility is included by default)
//   marketing    - sales, customers, partner module
//   partner      - partner module only

const ROLE_PERMISSIONS = {
    admin:       ['inventory', 'sales', 'customers', 'revenue', 'shipping', 'alerts', 'partners', 'manufacturers', 'users', 'sync'],
    developer:   ['inventory', 'sales', 'customers', 'revenue', 'shipping', 'alerts', 'partners', 'manufacturers', 'sync'],
    ops_manager: ['inventory', 'sales', 'customers', 'revenue', 'shipping', 'alerts', 'manufacturers', 'sync'],
    marketing:   ['sales', 'customers', 'partners'],
    partner:     ['partners'],
};

function extractBearerToken(authorizationHeader) {
    if (!authorizationHeader.startsWith('Bearer ')) {
        return null;
    }
    return authorizationHeader.slice(7);
}

function authenticate(req, res, next) {
    const authorizationHeader = req.headers.authorization || '';
    const token = extractBearerToken(authorizationHeader);

    if (token === null) {
        return res.status(401).json({ error: 'Not logged in. Please sign in.' });
    }

    try {
        const payload = jwt.verify(token, env.jwtSecret);
        req.user = payload; // { id, email, role, name }
        next();
    } catch {
        return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    }
}

// Usage: router.get('/route', authenticate, requirePermission('inventory'), handler)
function requirePermission(moduleKey) {
    function checkPermission(req, res, next) {
        const userRole = req.user ? req.user.role : null;
        const allowedModules = ROLE_PERMISSIONS[userRole] || [];

        if (!allowedModules.includes(moduleKey)) {
            return res.status(403).json({ error: `Your role (${userRole}) does not have access to this module.` });
        }

        next();
    }

    return checkPermission;
}

module.exports = { authenticate, requirePermission, ROLE_PERMISSIONS };