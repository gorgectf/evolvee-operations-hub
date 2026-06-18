import { requireEnv, getEnv, getJson, show } from "./_env.mjs";

const { SHOPIFY_STORE_DOMAIN, SHOPIFY_ADMIN_TOKEN } = requireEnv(
    "SHOPIFY_STORE_DOMAIN",
    "SHOPIFY_ADMIN_TOKEN"
);
const version = getEnv("SHOPIFY_API_VERSION", "2026-01");
const base = "https://" + SHOPIFY_STORE_DOMAIN + "/admin/api/" + version;
const headers = {
    "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
    "Content-Type": "application/json",
};

const url = base + "/orders.json?status=any&limit=5";

const orderData = await getJson(url, { headers });

let rawOrders;
if (orderData && orderData.orders) {
    rawOrders = orderData.orders;
} else {
    rawOrders = [];
}

const orders = [];
for (let i = 0; i < rawOrders.length; i++) {
    const o = rawOrders[i];
    const lineItems = [];
    for (let j = 0; j < (o.line_items || []).length; j++) {
        const item = o.line_items[j];
        lineItems.push({
            sku: item.sku,
            title: item.title,
            quantity: item.quantity,
        });
    }
    orders.push({
        name: o.name,
        created_at: o.created_at,
        financial_status: o.financial_status,
        fulfillment_status: o.fulfillment_status,
        total_price: o.total_price,
        currency: o.currency,
        line_items: lineItems,
    });
}

console.log("\n  Shopify returned " + orders.length + " recent order(s) (status=any).");
show("Sample orders (trimmed)", orders);