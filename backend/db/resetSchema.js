const { pool, query } = require('../src/config/db');
const { ensureSchema } = require('./applySchema');

const TABLES = [
    'reorder_history',
    'reorder_alerts',
    'reorder_thresholds',
    'communications',
    'production_runs',
    'sync_status',
    'products',
    'manufacturer_contacts',
    'manufacturers',
    'users'
];

async function resetSchema() {
    try {
        for (const table of TABLES) {
            await query('DROP TABLE IF EXISTS ' + table + ' CASCADE');
        }
        await ensureSchema();
        console.log('O: Database reset: all tables dropped and re-created.');
        console.log('  Run "npm run db:seed" to re-add demo data.');
    } catch (err) {
        console.error('X: Reset failed:', err.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

resetSchema();