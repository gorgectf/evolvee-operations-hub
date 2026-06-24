const { pool, query } = require('../src/config/db');
const { ensureSchema } = require('./applySchema');

async function resetSchema() {
    try {
        await query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
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