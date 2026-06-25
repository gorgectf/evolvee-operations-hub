// Single shared PostgreSQL connection pool for the whole backend.
const { Pool, types } = require('pg');
const env = require('./env');

types.setTypeParser(1082, (value) => value);

const pool = new Pool({
  connectionString: env.databaseUrl,
  // Railway/Render managed Postgres requires SSL; local Postgres does not.
  ssl: env.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
