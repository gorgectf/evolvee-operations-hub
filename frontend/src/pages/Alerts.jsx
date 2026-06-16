import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Alerts() {
    const [alerts, setAlerts] = useState(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [checking, setChecking] = useState(false);

    function load() {
        api('/alerts')
            .then((data) => setAlerts(data.alerts))
            .catch((e) => setError(e.message));
    }

    useEffect(() => {
        load();
    }, []);

    async function setStatus(id, status) {
        try {
            await api(`/alerts/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status }),
            });
            load();
        } catch (e) {
            setError(e.message);
        }
    }

    async function checkNow() {
        setChecking(true);
        setNotice('');
        setError('');

        try {
            const result = await api('/alerts/check-now', { method: 'POST' });
            const plural = result.alerts_created === 1 ? '' : 's';
            setNotice(
                `Checked ${result.checked} SKUs against Zoho Inventory — ` +
                `${result.alerts_created} new alert${plural} created.`
            );
            load();
        } catch (e) {
            setError(e.message);
        } finally {
            setChecking(false);
        }
    }

    function statusClass(status) {
        if (status === 'open') return 'low';
        if (status === 'acknowledged') return 'warn';
        return 'ok';
    }

    function formatDate(value) {
        return new Date(value).toLocaleDateString('en-GB');
    }

    return (
        <>
            <h1>Reorder alerts</h1>
            <p className="sub">
                Raised automatically when stock in Zoho Inventory falls to or below a SKU's reorder threshold. Checks run hourly.
            </p>

            {error && <div className="banner error">{error}</div>}
            {notice && <div className="banner notice">{notice}</div>}

            <p>
                <button className="primary" onClick={checkNow} disabled={checking}>
                    {checking ? 'Checking…' : 'Check stock now'}
                </button>
            </p>

            {alerts === null && <p className="empty">Loading…</p>}

            {alerts !== null && alerts.length === 0 && (
                <div className="tile">
                    <p className="empty">
                        No alerts. Every SKU is above its reorder threshold.
                    </p>
                </div>
            )}

            {alerts !== null && alerts.length > 0 && (
                <div className="tile">
                    <table>
                        <thead>
                            <tr>
                                <th>Raised</th>
                                <th>SKU</th>
                                <th>Product</th>
                                <th className="num">Stock</th>
                                <th className="num">Threshold</th>
                                <th>Manufacturer</th>
                                <th>Status</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {alerts.map((alert) => (
                                <tr key={alert.id}>
                                    <td>{formatDate(alert.triggered_at)}</td>
                                    <td>{alert.sku}</td>
                                    <td>{alert.product_name}</td>
                                    <td className="num">{alert.stock_level}</td>
                                    <td className="num">{alert.threshold}</td>
                                    <td>{alert.manufacturer || '—'}</td>
                                    <td>
                                        <span className={`pill ${statusClass(alert.status)}`}>
                                            {alert.status}
                                        </span>
                                    </td>
                                    <td>
                                        {alert.status === 'open' && (
                                            <button
                                                className="link"
                                                onClick={() => setStatus(alert.id, 'acknowledged')}
                                            >
                                                Acknowledge
                                            </button>
                                        )}
                                        {alert.status !== 'resolved' && (
                                            <button
                                                className="link"
                                                onClick={() => setStatus(alert.id, 'resolved')}
                                            >
                                                Resolve
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}