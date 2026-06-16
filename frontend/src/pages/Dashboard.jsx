import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getUser } from '../api.js';
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

function useModule(path, enabled) {
    const [state, setState] = useState({ loading: enabled, data: null, error: null });

    useEffect(() => {
        if (!enabled) return;

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
                                                <div className="l">SKUs need reordering</div>
                                            </div>
                                        </div>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>SKU</th>
                                                    <th>Product</th>
                                                    <th className="num">Stock</th>
                                                    <th className="num">Threshold</th>
                                                    <th>Manufacturer</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.open_alerts.slice(0, 5).map((alert) => (
                                                    <tr key={alert.id}>
                                                        <td>{alert.sku}</td>
                                                        <td>{alert.name}</td>
                                                        <td className="num">{alert.stock_level}</td>
                                                        <td className="num">{alert.threshold}</td>
                                                        <td>{alert.manufacturer || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
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
                    <Tile title="Stock levels" source="Zoho Inventory">
                        <Body state={inventory}>
                            {(data) => (
                                <table>
                                    <thead>
                                        <tr>
                                            <th>SKU</th>
                                            <th>Product</th>
                                            <th className="num">On hand</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.items.map((item) => (
                                            <tr key={item.sku}>
                                                <td>{item.sku}</td>
                                                <td>{item.name}</td>
                                                <td className="num">{item.stock_on_hand}</td>
                                                <td>{stockPill(item.low_stock)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </Body>
                    </Tile>
                )}

                {canAccess('sales') && (
                    <Tile title="Product sales — last 30 days" source="Shopify">
                        <Body state={sales}>
                            {(data) => (
                                <>
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
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Customer</th>
                                            <th>Segment</th>
                                            <th className="num">Orders</th>
                                            <th className="num">Total spent</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.customers.slice(0, 6).map((customer) => (
                                            <tr key={customer.id}>
                                                <td>{customer.name}</td>
                                                <td>
                                                    <span className="pill info">{customer.segment}</span>
                                                </td>
                                                <td className="num">{customer.orders_count}</td>
                                                <td className="num">{formatGBP(customer.total_spent)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Order</th>
                                                <th>Customer</th>
                                                <th>Courier</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.trackings.map((tracking) => (
                                                <tr key={tracking.tracking_number}>
                                                    <td>{tracking.order_id}</td>
                                                    <td>{tracking.customer}</td>
                                                    <td>{tracking.courier}</td>
                                                    <td>
                                                        <span className={`pill ${shippingStatusClass(tracking.status)}`}>
                                                            {tracking.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            )}
                        </Body>
                    </Tile>
                )}

                {canAccess('partners') && (
                    <Tile title="Partners & commissions" source="QR partner dashboard">
                        <Body state={partners}>
                            {(data) => {
                                if (data.placeholder) {
                                    return (
                                        <p className="empty">
                                            {data.message}
                                            <br />
                                            <span style={{ fontSize: 12.5 }}>
                                                This module switches on automatically once API access is confirmed.
                                            </span>
                                        </p>
                                    );
                                }
                                return (
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Partner</th>
                                                <th className="num">Scans</th>
                                                <th className="num">Commission</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.partners.map((partner) => (
                                                <tr key={partner.id}>
                                                    <td>{partner.name}</td>
                                                    <td className="num">{partner.scans}</td>
                                                    <td className="num">{formatGBP(partner.commission)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                );
                            }}
                        </Body>
                    </Tile>
                )}

                {canAccess('revenue') && (
                    <Tile title="Revenue" source="Shopify + Zoho Books" wide>
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