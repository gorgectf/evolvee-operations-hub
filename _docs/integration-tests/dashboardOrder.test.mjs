import assert from 'node:assert/strict';
import { applyOrder, dropBefore, reorder } from '../../frontend/src/dashboardOrder.js';

const items = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
const ids = (list) => list.map((x) => x.id);

// No saved order
assert.deepEqual(ids(applyOrder(items, [])), ['a', 'b', 'c', 'd']);

// Saved order reshuffles known ids
assert.deepEqual(ids(applyOrder(items, ['c', 'a', 'd', 'b'])), ['c', 'a', 'd', 'b']);

// Unknown id in saved order is ignored; new tile ('d') keeps default tail spot
assert.deepEqual(ids(applyOrder(items, ['c', 'a', 'x', 'b'])), ['c', 'a', 'b', 'd']);

// reorder: move 'd' before 'b'
assert.deepEqual(reorder(['a', 'b', 'c', 'd'], 'd', 'b'), ['a', 'd', 'b', 'c']);
// move 'a' before 'c'
assert.deepEqual(reorder(['a', 'b', 'c', 'd'], 'a', 'c'), ['b', 'a', 'c', 'd']);
// insert AFTER target: 'a' after 'c'
assert.deepEqual(reorder(['a', 'b', 'c', 'd'], 'a', 'c', false), ['b', 'c', 'a', 'd']);
// insert after the last tile
assert.deepEqual(reorder(['a', 'b', 'c'], 'a', 'c', false), ['b', 'c', 'a']);
// no-op cases
assert.deepEqual(reorder(['a', 'b'], 'a', 'a'), ['a', 'b']);
assert.deepEqual(reorder(['a', 'b'], 'a', 'z'), ['a', 'b']);

// dropBefore: anti-diagonal split reduces to both midpoints
const r = { left: 0, top: 0, width: 100, height: 100 };
assert.equal(dropBefore(r, 10, 10), true, 'upper-left -> before');
assert.equal(dropBefore(r, 90, 90), false, 'lower-right -> after');
assert.equal(dropBefore(r, 50, 10), true, 'top-center -> before (Y-midpoint)');
assert.equal(dropBefore(r, 50, 90), false, 'bottom-center -> after');
assert.equal(dropBefore(r, 10, 50), true, 'left-center -> before (X-midpoint)');
assert.equal(dropBefore(r, 90, 50), false, 'right-center -> after');

console.log('dashboardOrder self-check passed.');
