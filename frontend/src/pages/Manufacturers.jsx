import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useTableView, SortHeader, SearchBox, onEnter } from '../ui.jsx';

export default function Manufacturers() {
    const [list, setList] = useState(null);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ name: '', country: '', notes: '' });
    const [adding, setAdding] = useState(false);
    const { query, setQuery, view, sort, toggleSort } = useTableView(list, ['name', 'country', 'notes']);

    function load() {
        api('/manufacturers')
            .then(function (d) {
                setList(d.manufacturers);
            })
            .catch(function (e) {
                setError(e.message);
            });
    }

    useEffect(function () {
        load();
    }, []);

    function updateForm(field, value) {
        setForm(function (prev) {
            return { ...prev, [field]: value };
        });
    }

    async function create() {
        // Name is the only required field.
        if (!form.name.trim()) {
            setError('Manufacturer name is required.');
            return;
        }

        setError('');

        try {
            await api('/manufacturers', { method: 'POST', body: JSON.stringify(form) });
            setForm({ name: '', country: '', notes: '' });
            setAdding(false);
            load();
        } catch (e) {
            setError(e.message);
        }
    }

    return (
        <>
            <h1>Manufacturers &amp; suppliers</h1>
            <p className="sub">
                Every supplier relationship in one place — contacts, products, and history.
            </p>

            {error && (
                <div className="banner error">{error}</div>
            )}

            {adding ? (
                <div className="tile" style={{ marginBottom: 18, maxWidth: 560 }}>
                    <h2>New manufacturer</h2>

                    <div className="field">
                        <label>Name</label>
                        <input
                            value={form.name}
                            onChange={(e) => updateForm('name', e.target.value)}
                            onKeyDown={onEnter(create)}
                        />
                    </div>

                    <div className="field">
                        <label>Country</label>
                        <input
                            value={form.country}
                            onChange={(e) => updateForm('country', e.target.value)}
                            onKeyDown={onEnter(create)}
                        />
                    </div>

                    <div className="field">
                        <label>Notes (lead times, minimum orders…)</label>
                        <textarea
                            rows={2}
                            value={form.notes}
                            onChange={(e) => updateForm('notes', e.target.value)}
                        />
                    </div>

                    <div className="row" style={{ maxWidth: 280 }}>
                        <button className="primary" onClick={create}>Save manufacturer</button>
                        <button onClick={() => setAdding(false)}>Cancel</button>
                    </div>
                </div>
            ) : (
                <p>
                    <button className="primary" onClick={() => setAdding(true)}>
                        Add manufacturer
                    </button>
                </p>
            )}

            {!list ? (
                <p className="empty">Loading…</p>
            ) : (
                <div className="tile">
                    <div className="toolbar">
                        <SearchBox
                            query={query}
                            setQuery={setQuery}
                            placeholder="Search name, country, notes…"
                        />
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <SortHeader label="Name" sortKey="name" sort={sort} toggleSort={toggleSort} />
                                <SortHeader label="Country" sortKey="country" sort={sort} toggleSort={toggleSort} />
                                <SortHeader label="Products" sortKey="product_count" sort={sort} toggleSort={toggleSort} className="num" />
                                <SortHeader label="Active runs" sortKey="active_runs" sort={sort} toggleSort={toggleSort} className="num" />
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {view.length === 0 && (
                                <tr><td colSpan={5} className="empty">No manufacturers match “{query}”.</td></tr>
                            )}
                            {view.map(function (m) {
                                return (
                                    <tr key={m.id}>
                                        <td>
                                            <Link to={`/manufacturers/${m.id}`}>
                                                <strong>{m.name}</strong>
                                            </Link>
                                        </td>
                                        <td>{m.country || '—'}</td>
                                        <td className="num">{m.product_count}</td>
                                        <td className="num">{m.active_runs}</td>
                                        <td style={{ color: 'var(--muted)' }}>{m.notes || ''}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}