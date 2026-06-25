// Smoke test for live-mode integration parsing. Run: npm test (from backend/).
// Hermetic: fetch is stubbed and recordSync is no-op'd, so no network or DB.
process.env.SHOPIFY_MODE = 'live';
process.env.ZOHO_INVENTORY_MODE = 'live';
process.env.ZOHO_BOOKS_MODE = 'live';
process.env.ZOHO_CRM_MODE = 'live';
process.env.AFTERSHIP_MODE = 'live';
process.env.QR_PARTNER_MODE = 'live';
process.env.QR_PARTNER_API_BASE = 'https://qr.example/api';
process.env.SHOPIFY_STORE_DOMAIN = 'demo.myshopify.com';

const assert = require('assert');

const P = {
  token: { access_token: 'tok-123', expires_in: 3600 },
  orders: { orders: [
    { created_at: '2026-01-01T09:00:00Z', total_price: '100.00', line_items: [ { sku: 'A', title: 'Item A', quantity: 2, price: '10.00' } ] },
    { created_at: '2026-01-01T12:00:00Z', total_price: '50.00',  line_items: [ { title: 'Item B', quantity: 1, price: '50.00' } ] }, // no sku -> title
    { created_at: '2026-01-02T08:00:00Z', total_price: '0.00' },                                                                    // no line_items
  ]},
  customers: { customers: [
    { id: 1, first_name: 'Ada', last_name: 'Lovelace', email: 'ada@x.com', orders_count: 3, total_spent: '300.50' },
    { id: 2, first_name: '',    last_name: '',         email: 'no@x.com',  orders_count: 0, total_spent: '0' },
  ]},
  inventory: { items: [
    { sku: 'A', name: 'Item A', stock_on_hand: 0, reorder_level: 5 }, // 0 must survive (?? not ||)
    { sku: 'B', name: 'Item B', available_stock: 7 },                 // fallback; reorder absent -> 0
  ]},
  invoices: { invoices: [
    { date: '2026-01-15', total: '100.00' },
    { date: '2026-01-20', total: '50.00' },
    { date: '2026-02-01', total: '25.00' },
    { total: '999' },                          // no date -> skipped
  ]},
  crm: { data: [
    { id: 'c1', Email: 'ada@x.com', Lead_Source: 'Referral', Description: 'note' },
    { id: 'c2', Email: 'no@x.com' },           // defaults: Unknown / ''
  ]},
  trackings: { data: { trackings: [
    { tracking_number: 'T1', order_id: '#9', slug: 'royal-mail', tag: 'InTransit', customer_name: 'Ada', updated_at: '2026-03-01T10:00:00Z' },
    { tracking_number: 'T2', tag: 'Delivered' }, // missing optionals -> ''
  ]}},
  qr: { partners: [ { id: 'p1', name: 'Partner', scans: 10, commission: 5 } ] },
};

global.fetch = async (url) => {
  let body;
  if (url.includes('accounts.zoho')) body = P.token;
  else if (url.includes('/customers.json')) body = P.customers;
  else if (url.includes('/orders.json')) body = P.orders;
  else if (url.includes('inventory/v1/items')) body = P.inventory;
  else if (url.includes('books/v3/invoices')) body = P.invoices;
  else if (url.includes('crm/v6/Contacts')) body = P.crm;
  else if (url.includes('aftership.com')) body = P.trackings;
  else if (url.includes('/partners')) body = P.qr;
  else throw new Error('unexpected url: ' + url);
  return { ok: true, status: 200, json: async () => body, text: async () => '' };
};

require('./src/services/apiClient').recordSync = async () => {};

const shopify = require('./src/services/integrations/shopify');
const zohoInv = require('./src/services/integrations/zohoInventory');
const zohoBooks = require('./src/services/integrations/zohoBooks');
const zohoCrm = require('./src/services/integrations/zohoCrm');
const aftership = require('./src/services/integrations/aftership');
const qr = require('./src/services/integrations/qrPartner');

(async () => {
  const sales = await shopify.getSalesOverview();
  const a = sales.find((p) => p.sku === 'A');
  assert(a.units_sold_30d === 2 && a.revenue_30d === 20, 'shopify sales A units/revenue');
  assert(sales.find((p) => p.sku === 'Item B'), 'shopify sku falls back to title');
  console.log('OK  shopify.getSalesOverview');

  const cust = await shopify.getTopCustomers();
  assert(cust[0].name === 'Ada Lovelace' && cust[0].total_spent === 300.5, 'shopify customer name/spent');
  assert(cust[1].name === '', 'shopify blank name trims empty');
  console.log('OK  shopify.getTopCustomers');

  const daily = await shopify.getDailyRevenue();
  assert(daily.find((d) => d.date === '2026-01-01').revenue === 150, 'shopify daily group/sum');
  console.log('OK  shopify.getDailyRevenue');

  const inv = await zohoInv.getStockLevels();
  const ia = inv.find((i) => i.sku === 'A'), ib = inv.find((i) => i.sku === 'B');
  assert(ia.stock_on_hand === 0 && ia.reorder_level === 5, 'inventory keeps stock 0');
  assert(ib.stock_on_hand === 7 && ib.reorder_level === 0, 'inventory available_stock fallback');
  console.log('OK  zohoInventory.getStockLevels');

  const months = await zohoBooks.getMonthlyRevenue();
  assert(months.length === 2 && months.find((m) => m.month === '2026-01').revenue === 150, 'books month group/skip dateless');
  console.log('OK  zohoBooks.getMonthlyRevenue');

  const crm = await zohoCrm.getCrmCustomers();
  assert(crm[0].segment === 'Referral' && crm[1].segment === 'Unknown' && crm[1].lifetime_notes === '', 'crm defaults');
  console.log('OK  zohoCrm.getCrmCustomers');

  const tr = await aftership.getTrackings();
  assert(tr[0].status === 'InTransit' && tr[0].courier === 'royal-mail' && tr[0].last_update === '2026-03-01', 'aftership map');
  assert(tr[1].order_id === '' && tr[1].customer === '' && tr[1].last_update === '', 'aftership empty optionals');
  console.log('OK  aftership.getTrackings');

  const partners = await qr.getPartnerData();
  assert(partners.placeholder === false && partners.partners.length === 1, 'qr live shape');
  console.log('OK  qrPartner.getPartnerData');

  console.log('\nAll integration smoke tests passed.');
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
