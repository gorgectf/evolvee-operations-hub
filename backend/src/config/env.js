require('dotenv').config();

let nodeEnv = process.env.NODE_ENV;
if (!nodeEnv) {
    nodeEnv = 'development';
}
const isProduction = nodeEnv === 'production';

function required(name, fallback) {
    let value = process.env[name];
    if (value === undefined || value === null) {
        value = fallback;
    }
    if (value === undefined || value === '') {
        throw new Error('Missing required environment variable: ' + name + '. Check your backend/.env file.');
    }
    return value;
}

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

    const origins = raw.split(',');
    const cleaned = [];
    for (const origin of origins) {
        const trimmed = origin.trim().replace(/\/+$/, '');
        if (trimmed.length > 0) {
            cleaned.push(trimmed);
        }
    }
    return cleaned;
}

function envOr(name, fallback) {
    const value = process.env[name];
    if (value) {
        return value;
    }
    return fallback;
}

let portString = process.env.PORT;
if (!portString) {
    portString = '4000';
}
const port = parseInt(portString, 10);

let autoSeedRaw = process.env.AUTO_SEED;
if (!autoSeedRaw) {
    autoSeedRaw = 'false';
}
const autoSeed = autoSeedRaw.toLowerCase() === 'true';

const env = {
    port: port,
    nodeEnv: nodeEnv,
    isProduction: isProduction,
    databaseUrl: required('DATABASE_URL'),
    databaseSsl: envOr('DATABASE_SSL', ''),
    jwtSecret: requiredJwtSecret(),
    jwtExpiresIn: envOr('JWT_EXPIRES_IN', '8h'),
    corsOrigins: parseCorsOrigins(),
    autoSeed: autoSeed,
    stockCheckCron: envOr('STOCK_CHECK_CRON', '0 * * * *'),

    modes: {
        shopify: envOr('SHOPIFY_MODE', 'off'),
        zohoInventory: envOr('ZOHO_INVENTORY_MODE', 'off'),
        zohoBooks: envOr('ZOHO_BOOKS_MODE', 'off'),
        zohoCrm: envOr('ZOHO_CRM_MODE', 'off'),
        aftership: envOr('AFTERSHIP_MODE', 'off'),
        qrPartner: envOr('QR_PARTNER_MODE', 'placeholder')
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
        orgId: envOr('ZOHO_ORG_ID', ''),
        accountsBase: envOr('ZOHO_ACCOUNTS_BASE', 'https://accounts.zoho.com'),
        apiBase: envOr('ZOHO_API_BASE', 'https://www.zohoapis.com')
    },

    aftership: {
        apiKey: envOr('AFTERSHIP_API_KEY', '')
    },

    qrPartner: {
        apiBase: envOr('QR_PARTNER_API_BASE', ''),
        apiKey: envOr('QR_PARTNER_API_KEY', '')
    }
};

module.exports = env;