// Single shared PostgreSQL connection pool for the whole backend.
const { Pool, types } = require('pg');
const env = require('./env');

types.setTypeParser(1082, (value) => value);

function databaseSsl() {
  const override = (env.databaseSsl || '').trim().toLowerCase();
  if (override === 'true') return { rejectUnauthorized: false };
  if (override === 'false') return false;

  let host = '';
  try {
    host = new URL(env.databaseUrl).hostname;
  } catch {
    host = '';
  }
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  return isLocal ? false : { rejectUnauthorized: false };
}

const pool = new Pool({
  connectionString: env.databaseUrl,
  // Railway/Render managed Postgres requires SSL; local Postgres does not.
  ssl: databaseSsl(),
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
