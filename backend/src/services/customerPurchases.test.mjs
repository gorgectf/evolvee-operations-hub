import assert from 'node:assert';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { aggregateCustomerPurchases } = require('./customerPurchases.js');

const orders = [
    { name: '#1', created_at: '2026-06-01T10:00:00Z', total_price: '30.00', customer: { email: 'a@x' }, line_items: [{ sku: 'S1', title: 'Serum', quantity: 2 }] },
    { name: '#2', created_at: '2026-06-05T10:00:00Z', total_price: '16.00', customer: { email: 'a@x' }, line_items: [{ sku: 'S2', title: 'Oil', quantity: 1 }, { sku: 'S1', title: 'Serum', quantity: 1 }] },
    { name: '#3', created_at: '2026-06-02T10:00:00Z', total_price: '10.00', customer: null, line_items: [] }
];

const result = aggregateCustomerPurchases(orders);

assert.strictEqual(Object.keys(result).length, 1);
assert.strictEqual(result['a@x'].favorite_title, 'Serum');
assert.strictEqual(result['a@x'].favorite_units, 3);
assert.strictEqual(result['a@x'].history.length, 2);
assert.strictEqual(result['a@x'].history[0].order, '#2');

console.log('customerPurchases ok');
