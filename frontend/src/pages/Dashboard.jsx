import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getUser } from '../api.js';
import { useTableView, SortHeader, ExportButton, CopyText } from '../ui.jsx';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from 'recharts';

function formatGBP(amount) {
    return '£' + Number(amount).toLocaleString('en-GB', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function sumBy(list, key) {
    return (list || []).reduce((acc, item) => acc + Number(item[key] || 0), 0);
}

function formatCount(value) {
    return Number(value || 0).toLocaleString('en-GB');
}

function ExecKpiCards({ inventory, sales, revenue, shipping, alerts }) {
    const cards = [];

    if (revenue.data) {
        cards.push({
            key: 'revenue',
            label: 'Revenue — this month',
            value: formatGBP(sumBy(revenue.data.daily, 'revenue')),
        });
    }

    if (sales.data) {
        cards.push({
            key: 'sales-today',
            label: "Today's sales",
            value: formatGBP(sales.data.sales_today || 0),
        });
        cards.push({
            key: 'orders-today',
            label: 'Orders today',
            value: formatCount(sales.data.orders_today),
        });
        cards.push({
            key: 'sales-revenue',
            label: 'Sales — last 30 days',
            value: formatGBP(sumBy(sales.data.products, 'revenue_30d')),
        });
        cards.push({
            key: 'units',
            label: 'Units sold — 30 days',
            value: formatCount(sumBy(sales.data.products, 'units_sold_30d')),
        });
    }

    if (inventory.data) {
        const inventoryValue = (inventory.data.items || []).reduce(
            (acc, item) => acc + Number(item.price || 0) * Number(item.stock_on_hand || 0),
            0,
        );
        cards.push({
            key: 'inventory-value',
            label: 'Inventory value',
            value: formatGBP(inventoryValue),
        });
        cards.push({
            key: 'stock',
            label: 'Units in stock',
            value: formatCount(sumBy(inventory.data.items, 'stock_on_hand')),
        });
        cards.push({
            key: 'low-stock',
            label: 'Low stock SKUs',
            value: formatCount(inventory.data.low_count),
            bad: inventory.data.low_count > 0,
        });
    }

    if (shipping.data) {
        const pending = (shipping.data.trackings || []).filter((t) => t.status !== 'Delivered').length;
        cards.push({
            key: 'pending',
            label: 'Pending shipments',
            value: formatCount(pending),
            bad: (shipping.data.exceptions || []).length > 0,
        });
    }

    if (alerts.data) {
        cards.push({
            key: 'alerts',
            label: 'Open reorder alerts',
            value: formatCount(alerts.data.open_count),
            bad: alerts.data.open_count > 0,
        });
    }

    if (cards.length === 0) return null;

    return (
        <div className="kpi-strip">
            {cards.map((c) => (
                <div className="kpi kpi-card" key={c.key}>
                    <div className="v" style={c.bad ? { color: 'var(--bad)' } : undefined}>{c.value}</div>
                    <div className="l">{c.label}</div>
                </div>
            ))}
        </div>
    );
}

function Tile({ title, source, wide, children }) {
    return (
        <section className={`tile${wide ? ' wide' : ''}`}>
            <h2>
                {title} {source && <span className="src">{source}</span>}
            </h2>
            {children}
        </section>
    );
}

// Loads one dashboard module's data when enabled.
function useModule(path, enabled) {
    const [state, setState] = useState({ loading: enabled, data: null, error: null });

    useEffect(() => {
        if (!enabled) return;

        // Skip state updates if the effect was cleaned up before the fetch resolved.
        let active = true;

        api(path)
            .then((data) => {
                if (active) setState({ loading: false, data, error: null });
            })
            .catch((err) => {
                if (active) setState({ loading: false, data: null, error: err.message });
            });

        return () => {
            active = false;
        };
    }, [path, enabled]);

    return state;
}

// Renders loading and error states; otherwise passes data to children.
function Body({ state, children }) {
    if (state.loading) return <p className="empty">Loading…</p>;

    if (state.error) {
        return (
            <div className="banner error">
                Couldn't load this module: {state.error}
            </div>
        );
    }
    return children(state.data);
}

function stockPill(isLowStock) {
    if (isLowStock) return <span className="pill low">Low</span>;

    return <span className="pill ok">OK</span>;
}

function shippingStatusClass(status) {
    if (status === 'Delivered') return 'ok';
    if (status === 'Exception') return 'low';

    return 'info';
}

function DataTable({ columns, rows, filename, limit, copyKey, keyField = 'id' }) {
    const { view, sort, toggleSort } = useTableView(rows, []);
    const shown = limit ? view.slice(0, limit) : view;
    const csvColumns = columns.map((c) => ({ label: c.label, get: (row) => row[c.key] }));

    return (
        <>
            <div className="toolbar" style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
                <ExportButton filename={filename} columns={csvColumns} rows={view} />
            </div>
            <div className="table-scroll">
                <table>
                    <thead>
                        <tr>
                            {columns.map((c) => (
                                <SortHeader
                                    key={c.key}
                                    label={c.label}
                                    sortKey={c.key}
                                    sort={sort}
                                    toggleSort={toggleSort}
                                    className={c.num ? 'num' : undefined}
                                />
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {shown.map((row, i) => (
                            <tr key={row[keyField] ?? row[copyKey] ?? i}>
                                {columns.map((c) => (
                                    <td key={c.key} className={c.num ? 'num' : undefined}>
                                        {c.key === copyKey
                                            ? <CopyText value={row[c.key]} />
                                            : c.render
                                                ? c.render(row)
                                                : row[c.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

export default function Dashboard() {
    const user = getUser();

    function canAccess(permission) {
        return user?.permissions?.includes(permission);
    }

    const inventory = useModule('/dashboard/inventory', canAccess('inventory'));
    const sales = useModule('/dashboard/sales', canAccess('sales'));
    const customers = useModule('/dashboard/customers', canAccess('customers'));
    const revenue = useModule('/dashboard/revenue', canAccess('revenue'));
    const shipping = useModule('/dashboard/shipping', canAccess('shipping'));
    const alerts = useModule('/dashboard/alerts-summary', canAccess('alerts'));
    const partners = useModule('/dashboard/partners', canAccess('partners'));
    const sync = useModule('/sync/status', canAccess('sync'));

    // Sources that failed their most recent sync.
    const failedSources = (sync.data?.sources || []).filter((source) => source.ok === false);

    return (
        <>
            <h1>Operations dashboard</h1>
            <p className="sub">
                A single view of stock, sales, customers, revenue, and deliveries.
            </p>

            {failedSources.length > 0 && (
                <div className="banner error">
                    Data sync issue — the following sources failed their last update and may
                    be showing older data: {failedSources.map((source) => source.source).join(', ')}.
                </div>
            )}

            <ExecKpiCards
                inventory={inventory}
                sales={sales}
                revenue={revenue}
                shipping={shipping}
                alerts={alerts}
            />

            <div className="grid">
                {canAccess('alerts') && (
                    <Tile title="Reorder alerts" source="Manufacturer tool">
                        <Body state={alerts}>
                            {(data) => {
                                if (data.open_count === 0) {
                                    return (
                                        <p className="empty">
                                            No open alerts — all stock is above its reorder threshold.
                                        </p>
                                    );
                                }
                                return (
                                    <>
                                        <div className="kpis">
                                            <div className="kpi">
                                                <div className="v" style={{ color: 'var(--bad)' }}>
                                                    {data.open_count}
                                                </div>
                                                <div className="l">SKUs / item IDs need reordering</div>
                                            </div>
                                        </div>
                                        <DataTable
                                            rows={data.open_alerts}
                                            filename="reorder-alerts.csv"
                                            limit={5}
                                            copyKey="sku"
                                            columns={[
                                                { label: 'SKU / Item ID', key: 'sku' },
                                                { label: 'Product', key: 'name' },
                                                { label: 'Stock', key: 'stock_level', num: true },
                                                { label: 'Threshold', key: 'threshold', num: true },
                                                { label: 'Manufacturer', key: 'manufacturer', render: (a) => a.manufacturer || '—' },
                                            ]}
                                        />
                                        <p style={{ marginBottom: 0 }}>
                                            <Link to="/alerts">Manage alerts →</Link>
                                        </p>
                                    </>
                                );
                            }}
                        </Body>
                    </Tile>
                )}

                {canAccess('inventory') && (
                    <Tile title="Stock levels" source="Shopify">
                        <Body state={inventory}>
                            {(data) => (
                                <DataTable
                                    rows={data.items}
                                    filename="stock-levels.csv"
                                    copyKey="sku"
                                    keyField="sku"
                                    columns={[
                                        { label: 'SKU / Item ID', key: 'sku' },
                                        { label: 'Product', key: 'name' },
                                        { label: 'On hand', key: 'stock_on_hand', num: true },
                                        { label: 'Status', key: 'low_stock', render: (item) => stockPill(item.low_stock) },
                                    ]}
                                />
                            )}
                        </Body>
                    </Tile>
                )}

                {canAccess('sales') && (
                    <Tile title="Product sales — last 30 days" source="Shopify">
                        <Body state={sales}>
                            {(data) => (
                                <>
                                    <div className="toolbar" style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
                                        <ExportButton
                                            filename="product-sales.csv"
                                            rows={data.products}
                                            columns={[
                                                { label: 'SKU', get: (p) => p.sku },
                                                { label: 'Units sold (30d)', get: (p) => p.units_sold_30d },
                                            ]}
                                        />
                                    </div>
                                    <ResponsiveContainer width="100%" height={180}>
                                        <BarChart
                                            data={data.products}
                                            margin={{ top: 4, right: 8, left: -18, bottom: 0 }}
                                        >
                                            <CartesianGrid stroke="#f0ebe2" vertical={false} />
                                            <XAxis
                                                dataKey="sku"
                                                tick={{ fontSize: 10 }}
                                                interval={0}
                                                angle={-30}
                                                textAnchor="end"
                                                height={50}
                                            />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip formatter={(value) => [value, 'Units sold']} />
                                            <Bar
                                                dataKey="units_sold_30d"
                                                fill="#b08d4f"
                                                radius={[3, 3, 0, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                    <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 0 }}>
                                        Best seller:{' '}
                                        <strong style={{ color: 'var(--ink)' }}>
                                            {data.best_sellers[0]?.title}
                                        </strong>
                                        {' · '}
                                        Slowest:{' '}
                                        <strong style={{ color: 'var(--ink)' }}>
                                            {data.slow_movers[0]?.title}
                                        </strong>
                                    </p>
                                </>
                            )}
                        </Body>
                    </Tile>
                )}

                {canAccess('customers') && (
                    <Tile title="Top customers" source="Shopify + Zoho CRM">
                        <Body state={customers}>
                            {(data) => (
                                <DataTable
                                    rows={data.customers}
                                    filename="top-customers.csv"
                                    limit={6}
                                    columns={[
                                        { label: 'Customer', key: 'name' },
                                        { label: 'Segment', key: 'segment', render: (c) => <span className="pill info">{c.segment}</span> },
                                        { label: 'Orders', key: 'orders_count', num: true },
                                        { label: 'Total spent', key: 'total_spent', num: true, render: (c) => formatGBP(c.total_spent) },
                                    ]}
                                />
                            )}
                        </Body>
                    </Tile>
                )}

                {canAccess('shipping') && (
                    <Tile title="Orders in transit" source="AfterShip">
                        <Body state={shipping}>
                            {(data) => (
                                <>
                                    {data.exceptions.length > 0 && (
                                        <div className="banner error" style={{ marginBottom: 12 }}>
                                            {data.exceptions.length} delivery{' '}
                                            {data.exceptions.length === 1 ? 'problem' : 'problems'} — check{' '}
                                            {data.exceptions.map((exception) => exception.order_id).join(', ')}
                                        </div>
                                    )}
                                    <DataTable
                                        rows={data.trackings}
                                        filename="orders-in-transit.csv"
                                        keyField="tracking_number"
                                        columns={[
                                            { label: 'Order', key: 'order_id' },
                                            { label: 'Customer', key: 'customer' },
                                            { label: 'Courier', key: 'courier' },
                                            { label: 'Status', key: 'status', render: (t) => <span className={`pill ${shippingStatusClass(t.status)}`}>{t.status}</span> },
                                        ]}
                                    />
                                </>
                            )}
                        </Body>
                    </Tile>
                )}

                {canAccess('partners') && (
                    <Tile title="Partners & commissions" source="QR partner dashboard">
                        <Body state={partners}>
                            {(data) => <p className="empty">{data.message}</p>}
                        </Body>
                    </Tile>
                )}

                {canAccess('revenue') && (
                    <Tile title="Revenue" source="Shopify" wide>
                        <Body state={revenue}>
                            {(data) => (
                                <div className="row">
                                    <div style={{ minWidth: 280 }}>
                                        <h3 style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>
                                            Daily — this month
                                        </h3>
                                        <ResponsiveContainer width="100%" height={190}>
                                            <LineChart
                                                data={data.daily}
                                                margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
                                            >
                                                <CartesianGrid stroke="#f0ebe2" vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    tick={{ fontSize: 10 }}
                                                    tickFormatter={(value) => value.slice(8)}
                                                />
                                                <YAxis tick={{ fontSize: 11 }} />
                                                <Tooltip formatter={(value) => [formatGBP(value), 'Revenue']} />
                                                <Line
                                                    type="monotone"
                                                    dataKey="revenue"
                                                    stroke="#8a6a33"
                                                    strokeWidth={2}
                                                    dot={false}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div style={{ minWidth: 280 }}>
                                        <h3 style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>
                                            Monthly
                                        </h3>
                                        <ResponsiveContainer width="100%" height={190}>
                                            <BarChart
                                                data={data.monthly}
                                                margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
                                            >
                                                <CartesianGrid stroke="#f0ebe2" vertical={false} />
                                                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                                                <YAxis tick={{ fontSize: 11 }} />
                                                <Tooltip formatter={(value) => [formatGBP(value), 'Revenue']} />
                                                <Bar
                                                    dataKey="revenue"
                                                    fill="#b08d4f"
                                                    radius={[3, 3, 0, 0]}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}
                        </Body>
                    </Tile>
                )}
            </div>
        </>
    );
}