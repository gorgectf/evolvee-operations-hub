import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const EMPTY_FORM = { sku: '', name: '', manufacturer_id: '', threshold: '' };

export default function Products() {
    const [products, setProducts] = useState(null);
    const [manufacturers, setManufacturers] = useState([]);
    const [error, setError] = useState('');
    const [edits, setEdits] = useState({});
    const [form, setForm] = useState(EMPTY_FORM);

    function load() {
        return Promise.all([api('/products'), api('/manufacturers')])
            .then(([p, m]) => {
                setProducts(p.products);
                setManufacturers(m.manufacturers);
            })
            .catch((e) => setError(e.message));
    }

    useEffect(() => { load(); }, []);

    function updateForm(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function updateEdit(productId, value) {
        setEdits((prev) => ({ ...prev, [productId]: value }));
    }

    function clearEdit(productId) {
        setEdits((prev) => ({ ...prev, [productId]: undefined }));
    }

    async function saveThreshold(product) {
        const value = edits[product.id];
        if (value === undefined || value === '') return;
        try {
            await api(`/products/${product.id}/threshold`, {
                method: 'PUT',
                body: JSON.stringify({ threshold: Number(value) }),
            });
            clearEdit(product.id);
            load();
        } catch (e) {
            setError(e.message);
        }
    }

    async function assignManufacturer(product, manufacturerId) {
        try {
            await api(`/products/${product.id}/manufacturer`, {
                method: 'PATCH',
                body: JSON.stringify({ manufacturer_id: manufacturerId ? Number(manufacturerId) : null }),
            });
            load();
        } catch (e) {
            setError(e.message);
        }
    }

    async function createProduct() {
        if (!form.sku.trim() || !form.name.trim()) {
            return setError('SKU and product name are required.');
        }
        setError('');
        try {
            await api('/products', {
                method: 'POST',
                body: JSON.stringify({
                    ...form,
                    manufacturer_id: form.manufacturer_id ? Number(form.manufacturer_id) : null,
                    threshold: form.threshold === '' ? null : Number(form.threshold),
                }),
            });
            setForm(EMPTY_FORM);
            load();
        } catch (e) {
            setError(e.message);
        }
    }

    function renderManufacturerOptions() {
        return manufacturers.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
        ));
    }

    function renderRow(product) {
        return (
            <tr key={product.id}>
                <td>{product.sku}</td>
                <td>{product.name}</td>
                <td>
                    <select
                        value={product.manufacturer_id || ''}
                        onChange={(e) => assignManufacturer(product, e.target.value)}
                        style={{ maxWidth: 220 }}
                    >
                        <option value="">— unassigned —</option>
                        {renderManufacturerOptions()}
                    </select>
                </td>
                <td className="num">
                    <input
                        type="number"
                        min="0"
                        style={{ maxWidth: 90, textAlign: 'right' }}
                        value={edits[product.id] ?? product.threshold ?? ''}
                        onChange={(e) => updateEdit(product.id, e.target.value)}
                    />
                </td>
                <td>
                    <button className="link" onClick={() => saveThreshold(product)}>Save</button>
                </td>
            </tr>
        );
    }

    return (
        <>
            <h1>Products &amp; reorder thresholds</h1>
            <p className="sub">
                Link each SKU to its manufacturer and set the stock level that should trigger a reorder alert.
            </p>

            {error && <div className="banner error">{error}</div>}

            <div className="tile" style={{ marginBottom: 18 }}>
                <h2>Add product</h2>
                <div className="row">
                    <input
                        placeholder="SKU (e.g. ER-SER-009)"
                        value={form.sku}
                        onChange={(e) => updateForm('sku', e.target.value)}
                    />
                    <input
                        placeholder="Product name"
                        value={form.name}
                        onChange={(e) => updateForm('name', e.target.value)}
                    />
                    <select
                        value={form.manufacturer_id}
                        onChange={(e) => updateForm('manufacturer_id', e.target.value)}
                    >
                        <option value="">Manufacturer (optional)</option>
                        {renderManufacturerOptions()}
                    </select>
                    <input
                        type="number"
                        min="0"
                        placeholder="Threshold"
                        value={form.threshold}
                        onChange={(e) => updateForm('threshold', e.target.value)}
                        style={{ maxWidth: 120 }}
                    />
                    <button className="primary" onClick={createProduct} style={{ flex: '0 0 auto' }}>
                        Add
                    </button>
                </div>
            </div>

            {!products ? (
                <p className="empty">Loading…</p>
            ) : (
                <div className="tile">
                    <table>
                        <thead>
                            <tr>
                                <th>SKU</th>
                                <th>Product</th>
                                <th>Manufacturer</th>
                                <th className="num">Reorder threshold</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(renderRow)}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}