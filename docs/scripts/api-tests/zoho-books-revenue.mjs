import { requireEnv, getEnv, show } from "./_env.mjs";
import { getZohoAccessToken } from "./zoho-auth.mjs";

const { ZOHO_ORG_ID } = requireEnv("ZOHO_ORG_ID");
const apiDomain = getEnv("ZOHO_API_DOMAIN", "www.zohoapis.com");

const token = await getZohoAccessToken();

const url = "https://" + apiDomain + "/books/v3/invoices?organization_id=" + ZOHO_ORG_ID + "&per_page=10";
const res = await fetch(url, {
    headers: { Authorization: "Zoho-oauthtoken " + token },
});
const data = await res.json();

if (!res.ok || data.code !== 0) {
    console.error("\n  Zoho Books error (HTTP " + res.status + ").");
    console.error(JSON.stringify(data, null, 2).replace(/^/gm, "  "));
    console.error(
        "\n  Note: Books has no Retry-After header on its ~100 req/min cap, and the\n" +
        "  data-centre domain must match the account region.\n"
    );
    process.exit(1);
}

let rawInvoices;
if (data && data.invoices) {
    rawInvoices = data.invoices;
} else {
    rawInvoices = [];
}

const invoices = [];
for (let i = 0; i < rawInvoices.length; i++) {
    const inv = rawInvoices[i];
    invoices.push({
        number: inv.invoice_number,
        date: inv.date,
        status: inv.status,
        total: inv.total,
        currency: inv.currency_code,
    });
}

let revenue = 0;
for (let i = 0; i < invoices.length; i++) {
    revenue += Number(invoices[i].total) || 0;
}

console.log("\n  Zoho Books returned " + invoices.length + " recent invoice(s).");
console.log("  Sample revenue (sum of returned invoices): " + revenue.toFixed(2));
show("Sample invoices (trimmed)", invoices);