const { Pool, types } = require('pg');
const env = require('./env');

types.setTypeParser(1082, (value) => value);

function isLocalhost(connectionString) {
  try {
    const host = new URL(connectionString).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

function databaseSsl() {
  const override = (env.databaseSsl || '').trim().toLowerCase();

  if (override === 'false') {
    return false;
  }

  if (override !== 'true' && isLocalhost(env.databaseUrl)) {
    return false;
  }

  const ca = (env.databaseCaCert || '').replace(/\\n/g, '\n').trim();

  if (ca) {
    return {
      rejectUnauthorized: true,
      ca,
    };
  }

  return {
    rejectUnauthorized: false,
  };
}

const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: databaseSsl(),
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};