const fs = require('fs');
const path = require('path');
const { pool, query } = require('../src/config/db');

async function ensureSchema() {
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await query(sql);
}

async function runAsScript() {
    try {
        await ensureSchema();
        console.log('O: Schema applied successfully.');
    } catch (err) {
        console.error('X: Failed to apply schema:', err.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    runAsScript();
}

module.exports = { ensureSchema };