require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

function required(name, fallback) {
    const value = process.env[name] ?? fallback;

    if (value === undefined || value === '') {
        throw new Error('Missing required environment variable: ' + name + '. Check your backend/.env file.');
    }
    return value;
}

// Reject short or placeholder secrets, but only in production.
function requiredJwtSecret() {
    const value = required('JWT_SECRET');
    const placeholders = [
        'changeme',
        'change-me',
        'secret',
        'your-secret',
        'change-me-to-a-long-random-string'
    ];

    if (isProduction) {
        const tooShort = value.length < 32;
        const isPlaceholder = placeholders.includes(value.toLowerCase());
        if (tooShort || isPlaceholder) {
            throw new Error('JWT_SECRET is too weak for production. Use a long random string of 32+ characters.');
        }
    }
    return value;
}

function parseCorsOrigins() {
    let raw = process.env.CORS_ORIGIN;
    if (!raw) {
        raw = 'http://localhost:5173';
    }

    return raw
        .split(',')
        .map((origin) => origin.trim().replace(/\/+$/, ''))
        .filter((origin) => origin.length > 0);
}

function envOr(name, fallback) {
    return process.env[name] || fallback;
}

const port = parseInt(process.env.PORT || '4000', 10);

// AUTO_SEED=true means 'demo'; 'admin' seeds a single admin instead.
const seedModeRaw = (process.env.AUTO_SEED || 'false').toLowerCase();
const seedMode = seedModeRaw === 'true' ? 'demo' : seedModeRaw;
const autoSeed = seedMode === 'demo' || seedMode === 'admin';

const env = {
    port: port,
    nodeEnv: nodeEnv,
    isProduction: isProduction,
    databaseUrl: required('DATABASE_URL'),
    databaseSsl: envOr('DATABASE_SSL', ''),
    databaseCaCert: envOr('DATABASE_CA_CERT', ''),
    jwtSecret: requiredJwtSecret(),
    jwtExpiresIn: envOr('JWT_EXPIRES_IN', '8h'),
    corsOrigins: parseCorsOrigins(),
    autoSeed: autoSeed,
    seedMode: seedMode,
    stockCheckCron: envOr('STOCK_CHECK_CRON', '0 * * * *'),

    modes: {
        shopify: envOr('SHOPIFY_MODE', 'off'),
        zohoCrm: envOr('ZOHO_CRM_MODE', 'off'),
        aftership: envOr('AFTERSHIP_MODE', 'off')
    },

    shopify: {
        storeDomain: envOr('SHOPIFY_STORE_DOMAIN', ''),
        adminToken: envOr('SHOPIFY_ADMIN_TOKEN', ''),
        apiVersion: envOr('SHOPIFY_API_VERSION', '2025-04')
    },

    zoho: {
        clientId: envOr('ZOHO_CLIENT_ID', ''),
        clientSecret: envOr('ZOHO_CLIENT_SECRET', ''),
        refreshToken: envOr('ZOHO_REFRESH_TOKEN', ''),
        accountsBase: envOr('ZOHO_ACCOUNTS_BASE', 'https://accounts.zoho.com'),
        apiBase: envOr('ZOHO_API_BASE', 'https://www.zohoapis.com'),
        organizationId: envOr('ZOHO_ORGANIZATION_ID', '')
    },

    aftership: {
        apiKey: envOr('AFTERSHIP_API_KEY', ''),
        webhookSecret: envOr('AFTERSHIP_WEBHOOK_SECRET', '')
    }
};

module.exports = env;