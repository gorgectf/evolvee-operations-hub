// Central place for reading environment variables.
// Every other file imports from here instead of touching process.env directly,
// so missing/invalid config fails loudly in one place.
require('dotenv').config();

function required(name, fallback) {
    const value = process.env[name] ?? fallback;
    if (value === undefined || value === '') {
        throw new Error(`Missing required environment variable: ${name}. Check your backend/.env file.`);
    }
    return value;
}

const env = {
    port: parseInt(process.env.PORT || '4000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: required('DATABASE_URL'),
    jwtSecret: required('JWT_SECRET'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    stockCheckCron: process.env.STOCK_CHECK_CRON || '0 * * * *',

    modes: {
        shopify: process.env.SHOPIFY_MODE || 'sample',
        zohoInventory: process.env.ZOHO_INVENTORY_MODE || 'sample',
        zohoBooks: process.env.ZOHO_BOOKS_MODE || 'sample',
        zohoCrm: process.env.ZOHO_CRM_MODE || 'sample',
        aftership: process.env.AFTERSHIP_MODE || 'sample',
    },

    shopify: {
        storeDomain: process.env.SHOPIFY_STORE_DOMAIN || '',
        adminToken: process.env.SHOPIFY_ADMIN_TOKEN || '',
        apiVersion: process.env.SHOPIFY_API_VERSION || '2025-04',
    },
    zoho: {
        clientId: process.env.ZOHO_CLIENT_ID || '',
        clientSecret: process.env.ZOHO_CLIENT_SECRET || '',
        refreshToken: process.env.ZOHO_REFRESH_TOKEN || '',
        orgId: process.env.ZOHO_ORG_ID || '',
        accountsBase: process.env.ZOHO_ACCOUNTS_BASE || 'https://accounts.zoho.com',
        apiBase: process.env.ZOHO_API_BASE || 'https://www.zohoapis.com',
    },
    aftership: {
        apiKey: process.env.AFTERSHIP_API_KEY || '',
    },
};

module.exports = env;