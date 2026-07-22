const assert = require('assert');
const { buildSummaryUrl } = require('./partnerDashboard');

function test() {
    assert.strictEqual(
        buildSummaryUrl('https://partners.example.com'),
        'https://partners.example.com/api/ops-summary/'
    );
    assert.strictEqual(
        buildSummaryUrl('https://partners.example.com/'),
        'https://partners.example.com/api/ops-summary/',
        'trailing slash on base url must be stripped'
    );
    return 'buildSummaryUrl: 2 cases checked';
}

module.exports = { name: 'partnerDashboard buildSummaryUrl', test };

if (require.main === module) {
    console.log(test());
}
