const express = require('express');
const { query } = require('../config/db');
const { authenticate, requirePermission } = require('../middleware/auth');
const { asyncRoute } = require('../middleware/errorHandler');
const zohoInventory = require('../services/integrations/zohoInventory');
const shopify = require('../services/integrations/shopify');
const zohoBooks = require('../services/integrations/zohoBooks');
const zohoCrm = require('../services/integrations/zohoCrm');
const aftership = require('../services/integrations/aftership');
const qrPartner = require('../services/integrations/qrPartner');

const router = express.Router();
router.use(authenticate);

router.get('/inventory', requirePermission('inventory'), asyncRoute(async (req, res) => {
    const stock = await zohoInventory.getStockLevels();

    const thresholdResult = await query(
        'SELECT p.sku, rt.threshold ' +
        'FROM reorder_thresholds rt ' +
        'JOIN products p ON p.id = rt.product_id'
    );

    const thresholds = {};
    for (const row of thresholdResult.rows) {
        thresholds[row.sku] = row.threshold;
    }

    const items = [];
    for (const i of stock) {
        const threshold = thresholds[i.sku] ?? i.reorder_level ?? 0;

        const item = Object.assign({}, i);
        item.threshold = threshold;
        item.low_stock = i.stock_on_hand <= threshold;
        items.push(item);
    }

    const lowCount = items.filter((item) => item.low_stock).length;

    res.json({ items: items, low_count: lowCount });
}));

router.get('/sales', requirePermission('sales'), asyncRoute(async (req, res) => {
    const products = await shopify.getSalesOverview();

    const sorted = products.slice();
    sorted.sort(function (a, b) {
        return b.units_sold_30d - a.units_sold_30d;
    });

    const bestSellers = sorted.slice(0, 3);

    const slowMovers = sorted.slice(-3);
    slowMovers.reverse();

    res.json({
        products: sorted,
        best_sellers: bestSellers,
        slow_movers: slowMovers
    });
}));

router.get('/customers', requirePermission('customers'), asyncRoute(async (req, res) => {
    const shop = await shopify.getTopCustomers();
    const crm = await zohoCrm.getCrmCustomers();

    const crmByEmail = {};
    for (const c of crm) {
        crmByEmail[c.email] = c;
    }

    shop.sort(function (a, b) {
        return b.total_spent - a.total_spent;
    });
    const topTen = shop.slice(0, 10);

    const customers = [];
    for (const c of topTen) {
        const crmEntry = crmByEmail[c.email];

        let segment = '—';
        let crmNotes = '';
        if (crmEntry) {
            if (crmEntry.segment) {
                segment = crmEntry.segment;
            }
            if (crmEntry.lifetime_notes) {
                crmNotes = crmEntry.lifetime_notes;
            }
        }

        const customer = Object.assign({}, c);
        customer.segment = segment;
        customer.crm_notes = crmNotes;
        customers.push(customer);
    }

    res.json({ customers: customers });
}));

router.get('/revenue', requirePermission('revenue'), asyncRoute(async (req, res) => {
    const daily = await shopify.getDailyRevenue();
    const monthly = await zohoBooks.getMonthlyRevenue();

    const weekly = {};
    for (const d of daily) {
        const dt = new Date(d.date + 'T00:00:00Z');
        const monday = new Date(dt);
        const offsetToMonday = (dt.getUTCDay() + 6) % 7;
        monday.setUTCDate(dt.getUTCDate() - offsetToMonday);

        const key = monday.toISOString().slice(0, 10);
        weekly[key] = (weekly[key] || 0) + d.revenue;
    }

    const weekKeys = Object.keys(weekly);
    weekKeys.sort();

    const weeklyList = [];
    for (const key of weekKeys) {
        weeklyList.push({
            week_starting: key,
            revenue: Number(weekly[key].toFixed(2))
        });
    }

    res.json({
        daily: daily,
        weekly: weeklyList,
        monthly: monthly
    });
}));

router.get('/shipping', requirePermission('shipping'), asyncRoute(async (req, res) => {
    const trackings = await aftership.getTrackings();

    const byStatus = {};
    for (const t of trackings) {
        byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    }

    const exceptions = trackings.filter((t) => t.status === 'Exception');

    res.json({
        trackings: trackings,
        by_status: byStatus,
        exceptions: exceptions
    });
}));

router.get('/alerts-summary', requirePermission('alerts'), asyncRoute(async (req, res) => {
    const sql =
        'SELECT ra.id, p.sku, p.name, ra.stock_level, ra.threshold, ra.status, ra.triggered_at, ' +
        '       m.name AS manufacturer ' +
        'FROM reorder_alerts ra ' +
        'JOIN products p ON p.id = ra.product_id ' +
        'LEFT JOIN manufacturers m ON m.id = p.manufacturer_id ' +
        "WHERE ra.status = 'open' " +
        'ORDER BY ra.triggered_at DESC ' +
        'LIMIT 20';

    const result = await query(sql);

    res.json({
        open_alerts: result.rows,
        open_count: result.rows.length
    });
}));

// QR partner dashboard module placeholder
router.get('/partners', requirePermission('partners'), asyncRoute(async (req, res) => {
    const data = await qrPartner.getPartnerData();
    res.json(data);
}));

module.exports = router;