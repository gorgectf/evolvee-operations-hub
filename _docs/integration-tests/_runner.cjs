// Shared helpers for the live integration connectivity tests.
//
// Each test in this folder makes a REAL request to one external service using the
// credentials in backend/.env, and reports full detail on failure. A service is
// SKIPped (not failed) unless its *_MODE is set to "live", matching how the app
// decides to make live calls.
//
// Dependency-free on purpose: these files live outside backend/, where its
// node_modules isn't resolvable. fetch is global on Node 20+, and the .env reader
// below replaces dotenv.

const fs = require('fs');
const path = require('path');

// ponytail: minimal .env reader — handles KEY=VALUE, blank lines, #-comment lines
// and surrounding quotes. No multiline/export/inline-comment support; the project's
// .env doesn't use them. Swap in dotenv if the format grows.
function loadEnv(file) {
    let text;
    try {
        text = fs.readFileSync(file, 'utf8');
    } catch (err) {
        return; // no .env file -> fall back to the real process.env
    }
    for (const line of text.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (!match) continue; // comment / blank / malformed
        const key = match[1];
        let value = match[2].trim();
        const quoted = (value.startsWith('"') && value.endsWith('"')) ||
                       (value.startsWith("'") && value.endsWith("'"));
        if (quoted) value = value.slice(1, -1);
        if (!(key in process.env)) process.env[key] = value;
    }
}

loadEnv(path.join(__dirname, '..', '..', 'backend', '.env'));

const TIMEOUT_MS = Number(process.env.INTEGRATION_TEST_TIMEOUT_MS || 20000);

// Thrown to mark a test as skipped rather than failed.
class SkipError extends Error {}

// Skip the test unless the given *_MODE env var is "live".
function mode(varName) {
    const value = (process.env[varName] || '').toLowerCase();
    if (value !== 'live') {
        throw new SkipError(
            `${varName}=${value || '(unset)'} — set ${varName}=live in backend/.env to run this live check.`
        );
    }
    return value;
}

// Fail the test with a clear message if any required .env value is missing.
function need(...names) {
    const missing = names.filter((n) => !(process.env[n] && process.env[n].trim()));
    if (missing.length) {
        throw new Error(`Missing required .env value(s): ${missing.join(', ')}. Fill them in backend/.env.`);
    }
}

// Hide secrets that travel in query strings (Zoho's token endpoint) before logging.
function redact(url) {
    return url.replace(/(client_secret|client_id|refresh_token)=[^&]*/gi, '$1=***');
}

// Make the request and return parsed JSON ({} for an empty 2xx body). On any
// failure throw an Error carrying a .detail object the reporter prints in full.
async function http(url, options = {}) {
    const method = options.method || 'GET';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response;
    try {
        response = await fetch(url, Object.assign({}, options, { signal: controller.signal }));
    } catch (err) {
        const wrapped = new Error(
            err.name === 'AbortError'
                ? `Request timed out after ${TIMEOUT_MS / 1000}s`
                : `Network/connection error: ${err.message}`
        );
        const cause = err.cause || {};
        wrapped.detail = {
            request: `${method} ${redact(url)}`,
            errorName: err.name,
            code: cause.code || err.code,
            cause: cause.message || (err.cause ? String(err.cause) : undefined),
        };
        throw wrapped;
    } finally {
        clearTimeout(timer);
    }

    const bodyText = await response.text().catch(() => '');

    if (!response.ok) {
        const err = new Error(`HTTP ${response.status} ${response.statusText || ''}`.trim());
        err.detail = {
            request: `${method} ${redact(url)}`,
            status: `${response.status} ${response.statusText}`,
            body: bodyText,
        };
        throw err;
    }

    if (!bodyText) return {};
    try {
        return JSON.parse(bodyText);
    } catch (err) {
        const e = new Error(`Response was not valid JSON: ${err.message}`);
        e.detail = { request: `${method} ${redact(url)}`, status: String(response.status), body: bodyText };
        throw e;
    }
}

// Zoho's three services share one OAuth refresh -> access token exchange.
let zohoTokenCache = null;
async function zohoToken() {
    if (zohoTokenCache) return zohoTokenCache;
    need('ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN');
    const base = process.env.ZOHO_ACCOUNTS_BASE || 'https://accounts.zoho.com';
    const url = base + '/oauth/v2/token' +
        '?refresh_token=' + encodeURIComponent(process.env.ZOHO_REFRESH_TOKEN) +
        '&client_id=' + encodeURIComponent(process.env.ZOHO_CLIENT_ID) +
        '&client_secret=' + encodeURIComponent(process.env.ZOHO_CLIENT_SECRET) +
        '&grant_type=refresh_token';

    const data = await http(url, { method: 'POST' });
    if (!data.access_token) {
        const err = new Error('Zoho token refresh returned no access_token — check ZOHO_* values.');
        err.detail = { request: 'POST ' + redact(url), body: JSON.stringify(data) };
        throw err;
    }
    zohoTokenCache = data.access_token;
    return zohoTokenCache;
}

// Run an array of { name, test } and print a per-test line plus a summary.
// Sets process.exitCode to 1 if anything failed (skips don't count).
async function run(tests) {
    let passed = 0, failed = 0, skipped = 0;
    console.log('Integration connectivity tests (using backend/.env)\n');

    for (const t of tests) {
        const start = Date.now();
        try {
            const summary = await t.test();
            passed++;
            console.log(`PASS  ${t.name}  (${Date.now() - start}ms)` + (summary ? `  — ${summary}` : ''));
        } catch (err) {
            if (err instanceof SkipError) {
                skipped++;
                console.log(`SKIP  ${t.name}  — ${err.message}`);
                continue;
            }
            failed++;
            console.error(`\nFAIL  ${t.name}  (${Date.now() - start}ms)`);
            console.error('  ' + err.message);
            for (const [key, value] of Object.entries(err.detail || {})) {
                if (value === undefined || value === '') continue;
                const text = String(value);
                console.error(`    ${key}: ${text.length > 4000 ? text.slice(0, 4000) + ' …[truncated]' : text}`);
            }
            if (err.stack) console.error(err.stack.split('\n').slice(1).join('\n'));
            console.error('');
        }
    }

    console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped.`);
    process.exitCode = failed > 0 ? 1 : 0;
    return failed;
}

module.exports = { http, mode, need, redact, zohoToken, run, SkipError };
