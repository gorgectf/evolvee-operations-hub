const env = require('../../config/env');
const { callExternal } = require('../apiClient');

let cached = { token: null, expiresAt: 0 };

async function getZohoAccessToken() {
    const safetyWindowMs = 60000;
    if (cached.token && Date.now() < cached.expiresAt - safetyWindowMs) {
        return cached.token;
    }

    const refreshToken = encodeURIComponent(env.zoho.refreshToken);
    const clientId = encodeURIComponent(env.zoho.clientId);
    const clientSecret = encodeURIComponent(env.zoho.clientSecret);

    const url =
        env.zoho.accountsBase + '/oauth/v2/token' +
        '?refresh_token=' + refreshToken +
        '&client_id=' + clientId +
        '&client_secret=' + clientSecret +
        '&grant_type=refresh_token';

    const data = await callExternal(url, { method: 'POST' });

    if (!data.access_token) {
        throw new Error('Zoho token refresh failed — check ZOHO_* values in .env');
    }

    let expiresInSeconds = 3600;
    if (data.expires_in) {
        expiresInSeconds = data.expires_in;
    }

    cached = {
        token: data.access_token,
        expiresAt: Date.now() + (expiresInSeconds * 1000)
    };
    return cached.token;
}

module.exports = { getZohoAccessToken };