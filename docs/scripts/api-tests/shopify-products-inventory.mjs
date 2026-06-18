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

const productData = await getJson(base + "/products.json?limit=3", { headers });

let rawProducts;
if (productData && productData.products) {
    rawProducts = productData.products;
} else {
    rawProducts = [];
}

const products = [];
for (let i = 0; i < rawProducts.length; i++) {
    const p = rawProducts[i];
    const variants = [];
    for (let j = 0; j < p.variants.length; j++) {
        const v = p.variants[j];
        variants.push({
            sku: v.sku,
            price: v.price,
            inventory_item_id: v.inventory_item_id,
        });
    }
    products.push({
        id: p.id,
        title: p.title,
        variants: variants,
    });
}

console.log("\n  Shopify returned " + products.length + " product(s).");
show("Sample products (trimmed)", products);

let firstItem;
if (products[0] && products[0].variants && products[0].variants[0]) {
    firstItem = products[0].variants[0].inventory_item_id;
} else {
    firstItem = null;
}

if (firstItem) {
    const inv = await getJson(
        base + "/inventory_levels.json?inventory_item_ids=" + firstItem,
        { headers }
    );
    let inventoryLevels;
    if (inv && inv.inventory_levels) {
        inventoryLevels = inv.inventory_levels;
    } else {
        inventoryLevels = inv;
    }
    show("Inventory levels for inventory_item_id " + firstItem, inventoryLevels);
} else {
    console.log("  No variant inventory_item_id available to look up stock.\n");
}