// Centralised external API handler (spec 4.d "Shared Components").
// All live API calls from every integration service go through callExternal()
// so timeouts, error shaping, and sync-status recording live in one place.

const { query } = require('../config/db');

function getHost(url) {
    const parsed = new URL(url);
    return parsed.host;
}

async function callExternal(url, options = {}, config = {}) {
    let timeoutMs = config.timeoutMs;
    if (timeoutMs === undefined) {
        timeoutMs = 15000;
    }

    const controller = new AbortController();

    function abortRequest() {
        controller.abort();
    }

    const timer = setTimeout(abortRequest, timeoutMs);

    try {
        const requestOptions = Object.assign({}, options);
        requestOptions.signal = controller.signal;

        const response = await fetch(url, requestOptions);

        if (!response.ok) {
            let body = '';
            try {
                body = await response.text();
            } catch (readError) {
                body = '';
            }

            const host = getHost(url);
            const preview = body.slice(0, 200);
            throw new Error(`HTTP ${response.status} from ${host}: ${preview}`);
        }

        return await response.json();
    } catch (error) {
        if (error.name === 'AbortError') {
            const host = getHost(url);
            const seconds = timeoutMs / 1000;
            throw new Error(`Request to ${host} timed out after ${seconds}s`);
        }

        throw error;
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

    try {
        await query(sql, [source, mode, ok, message]);
    } catch (error) {
        console.error('Failed to record sync status:', error.message);
    }
}

module.exports = { callExternal, recordSync };