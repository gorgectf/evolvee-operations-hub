import assert from 'node:assert';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { computeProductMetrics } = require('../../backend/src/services/productMetrics.js');

const normal = computeProductMetrics(
    { sku: 'X', title: 'Serum', units_sold_30d: 412, revenue_30d: 14008 },
    { stock_on_hand: 34, price: 34 },
    12
);
assert.strictEqual(normal.margin_pct, 64.7);
assert.strictEqual(normal.margin_30d, 9064);
assert.strictEqual(normal.turnover, 12.12);
assert.strictEqual(normal.sell_through, 92.4);

const noCost = computeProductMetrics(
    { sku: 'Y', units_sold_30d: 10, revenue_30d: 100 },
    { stock_on_hand: 0, price: 10 },
    undefined
);
assert.strictEqual(noCost.margin_pct, null);
assert.strictEqual(noCost.turnover, null);
assert.strictEqual(noCost.sell_through, 100);

const empty = computeProductMetrics(
    { sku: 'Z', units_sold_30d: 0, revenue_30d: 0 },
    undefined,
    undefined
);
assert.strictEqual(empty.turnover, null);
assert.strictEqual(empty.sell_through, null);
assert.strictEqual(empty.margin_30d, null);

const derivedPrice = computeProductMetrics(
    { sku: 'W', units_sold_30d: 4, revenue_30d: 200 },
    undefined,
    30
);
assert.strictEqual(derivedPrice.margin_pct, 40);

console.log('productMetrics ok');
