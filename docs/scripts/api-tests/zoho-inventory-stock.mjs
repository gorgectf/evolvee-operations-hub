import { requireEnv, getEnv, show } from "./_env.mjs";
import { getZohoAccessToken } from "./zoho-auth.mjs";

const { ZOHO_ORG_ID } = requireEnv("ZOHO_ORG_ID");
const apiDomain = getEnv("ZOHO_API_DOMAIN", "www.zohoapis.com");

const token = await getZohoAccessToken();

const url = "https://" + apiDomain + "/inventory/v1/items?organization_id=" + ZOHO_ORG_ID;
const res = await fetch(url, {
    headers: { Authorization: "Zoho-oauthtoken " + token },
});
const data = await res.json();

if (!res.ok || data.code !== 0) {
    console.error("\n  Zoho Inventory error (HTTP " + res.status + ").");
    console.error(JSON.stringify(data, null, 2).replace(/^/gm, "  "));
    console.error(
        "\n  If you see 'user is not associated with the organization', the\n" +
        "  ZOHO_ORG_ID is wrong for this account/region.\n"
    );
    process.exit(1);
}

let rawItems;
if (data && data.items) {
    rawItems = data.items;
} else {
    rawItems = [];
}

const totalCount = rawItems.length;

const items = [];
for (let i = 0; i < rawItems.length && i < 5; i++) {
    const item = rawItems[i];
    items.push({
        name: item.name,
        sku: item.sku,
        stock_on_hand: item.stock_on_hand,
        available_stock: item.available_stock,
    });
}

console.log("\n  Zoho Inventory returned " + totalCount + " item(s).");
show("Sample stock levels (trimmed)", items);