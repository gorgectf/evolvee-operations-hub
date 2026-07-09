// Centralised external API handler.
// All live API calls from every integration service go through callExternal()
// so timeouts, error shaping, and sync-status recording live in one place.

const { query } = require('../config/db');

function getHost(url) {
    const parsed = new URL(url);
    return parsed.host;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function attempt(url, options, config, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const requestOptions = Object.assign({}, options, { signal: controller.signal });
        const response = await fetch(url, requestOptions);

        if (!response.ok) {
            let body = '';
            try {
                body = await response.text();
            } catch (readError) {
                body = '';
            }

            const host = getHost(url);
            const err = new Error(`HTTP ${response.status} from ${host}: ${body.slice(0, 200)}`);
            err.status = response.status;
            err.retryAfterMs = Number(response.headers.get('retry-after') || 0) * 1000;
            throw err;
        }

        const json = await response.json();
        return config.includeHeaders ? { data: json, headers: response.headers } : json;
    } catch (error) {
        if (error.name === 'AbortError') {
            const seconds = timeoutMs / 1000;
            throw new Error(`Request to ${getHost(url)} timed out after ${seconds}s`);
        }
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

// ponytail: retry only on 429, once. Add exponential backoff / more retries if a provider needs it.
async function callExternal(url, options = {}, config = {}) {
    const timeoutMs = config.timeoutMs ?? 15000;

    try {
        return await attempt(url, options, config, timeoutMs);
    } catch (error) {
        if (error.status === 429) {
            await wait(error.retryAfterMs > 0 ? error.retryAfterMs : 1000);
            return attempt(url, options, config, timeoutMs);
        }
        throw error;
    }
}

// Record the result of a sync attempt so the frontend can surface failures
// instead of silently showing stale data.
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

async function withSync(source, mode, run, offValue = []) {
    if (mode === 'off') {
        await recordSync(source, 'off', true);
        return offValue;
    }

    try {
        const data = await run();
        await recordSync(source, mode, true);
        return data;
    } catch (error) {
        await recordSync(source, mode, false, error.message);
        throw error;
    }
}

module.exports = { callExternal, withSync };