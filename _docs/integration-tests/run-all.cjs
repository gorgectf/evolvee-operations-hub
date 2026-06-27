const { run, redact } = require('./_runner.cjs');

const tests = [
    require('./shopify.test.cjs'),
    require('./zohoCrm.test.cjs'),
    require('./aftership.test.cjs'),
];

if (process.argv.includes('--selfcheck')) {
    const assert = require('assert');
    const redacted = redact('https://accounts.zoho.com/oauth/v2/token?refresh_token=ABC&client_id=ID&client_secret=SECRET&grant_type=refresh_token');
    assert.ok(!redacted.includes('ABC') && !redacted.includes('SECRET') && !redacted.includes('=ID&'), 'redact must hide secrets');
    assert.ok(redacted.includes('grant_type=refresh_token'), 'redact must keep non-secret params');
    assert.strictEqual(tests.length, 3, 'all three integrations registered');
    console.log('run-all self-check passed.');
} else {
    run(tests);
}
