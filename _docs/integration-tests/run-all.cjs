// Runs every integration connectivity test and prints one summary.
//   node run-all.cjs              run all tests (uses backend/.env)
//   node run-all.cjs --selfcheck  no-network check of the helper logic
const { run, redact } = require('./_runner.cjs');

const tests = [
    require('./shopify.test.cjs'),
    require('./zohoInventory.test.cjs'),
    require('./zohoBooks.test.cjs'),
    require('./zohoCrm.test.cjs'),
    require('./aftership.test.cjs'),
    require('./qrPartner.test.cjs'),
];

if (process.argv.includes('--selfcheck')) {
    const assert = require('assert');
    // Secrets in query strings must never reach the logs.
    const redacted = redact('https://accounts.zoho.com/oauth/v2/token?refresh_token=ABC&client_id=ID&client_secret=SECRET&grant_type=refresh_token');
    assert.ok(!redacted.includes('ABC') && !redacted.includes('SECRET') && !redacted.includes('=ID&'), 'redact must hide secrets');
    assert.ok(redacted.includes('grant_type=refresh_token'), 'redact must keep non-secret params');
    assert.strictEqual(tests.length, 6, 'all six integrations registered');
    console.log('run-all self-check passed.');
} else {
    run(tests);
}
