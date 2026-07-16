const { query } = require('../config/db');

// Best-effort audit logging; failures here should never break the calling request.
async function recordAudit(req, { action, entity, entityId, details }) {
    try {
        await query(
            'INSERT INTO audit_log (user_id, user_name, action, entity, entity_id, details) ' +
            'VALUES ($1, $2, $3, $4, $5, $6)',
            [
                req.user?.id ?? null,
                req.user?.name ?? null,
                action,
                entity,
                entityId ?? null,
                details ? JSON.stringify(details) : null,
            ]
        );
    } catch (err) {
        console.error('[audit] failed to record:', err.message);
    }
}

module.exports = { recordAudit };
