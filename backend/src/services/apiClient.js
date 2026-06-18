// Centralised external API handler (spec 4.d "Shared Components").
// All live API calls from every integration service go through callExternal()
// so timeouts, error shaping, and sync-status recording live in one place.

const { query } = require('../config/db');

async function callExternal(url, options = {}, { timeoutMs = 15000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, { ...options, signal: controller.signal });

        if (!res.ok) {
            const body = await res.text().catch(() => '');
            const host = new URL(url).host;
            const preview = body.slice(0, 200);
            throw new Error(`HTTP ${res.status} from ${host}: ${preview}`);
        }

        return await res.json();
    } catch (err) {
        if (err.name === 'AbortError') {
            const host = new URL(url).host;
            const seconds = timeoutMs / 1000;
            throw new Error(`Request to ${host} timed out after ${seconds}s`);
        }
        
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

// Record the result of a sync attempt so the frontend can surface failures
// instead of silently showing stale data (spec: Reliability requirement).
async function recordSync(source, mode, ok, message = null) {
    const sql = `
        INSERT INTO sync_status (source, mode, last_run_at, last_success, ok, message)
        VALUES ($1, $2, NOW(), CASE WHEN $3 THEN NOW() ELSE NULL END, $3, $4)
        ON CONFLICT (source) DO UPDATE SET
            mode         = EXCLUDED.mode,
            last_run_at  = NOW(),
            last_success = CASE WHEN $3 THEN NOW() ELSE sync_status.last_success END,
            ok           = $3,
            message      = $4
    `;

    await query(sql, [source, mode, ok, message]).catch(function onSyncError(err) {
        console.error('Failed to record sync status:', err.message);
    });
}

module.exports = { callExternal, recordSync };