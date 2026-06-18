import { requireEnv, getEnv } from "./_env.mjs";

export async function getZohoAccessToken() {
    const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN } = requireEnv(
        "ZOHO_CLIENT_ID",
        "ZOHO_CLIENT_SECRET",
        "ZOHO_REFRESH_TOKEN"
    );
    const accountsDomain = getEnv("ZOHO_ACCOUNTS_DOMAIN", "accounts.zoho.com");

    const params = new URLSearchParams({
        refresh_token: ZOHO_REFRESH_TOKEN,
        client_id: ZOHO_CLIENT_ID,
        client_secret: ZOHO_CLIENT_SECRET,
        grant_type: "refresh_token",
    });

    const res = await fetch("https://" + accountsDomain + "/oauth/v2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
    });
    const data = await res.json();

    if (!res.ok || !data.access_token) {
        console.error("\n  Zoho token exchange failed.");
        console.error(JSON.stringify(data, null, 2).replace(/^/gm, "  "));
        console.error(
            "\n  Common causes: wrong data-centre domain (try accounts.zoho.eu for a UK/EU\n" +
            "  account), an expired/revoked refresh token, or a refresh token generated\n" +
            "  without access_type=offline.\n"
        );
        process.exit(1);
    }
    return data.access_token;
}