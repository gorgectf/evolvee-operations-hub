// Applies db/schema.sql to the database in DATABASE_URL.
// Run with:  npm run db:schema   (from the backend folder)

const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

async function applySchema() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

        await pool.query(sql);

        console.log('O: Schema applied successfully.');
    } catch (err) {
        console.error('X: Failed to apply schema:', err.message);
        
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

applySchema();