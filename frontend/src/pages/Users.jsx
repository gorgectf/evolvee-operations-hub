import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useTableView, SortHeader, SearchBox, onEnter } from '../ui.jsx';

const ROLES = ['admin', 'developer', 'ops_manager', 'marketing', 'partner'];

const EMPTY_FORM = { email: '', full_name: '', password: '', role: 'marketing' };

export default function Users() {
    const [users, setUsers] = useState(null);
    const [error, setError] = useState('');
    const [form, setForm] = useState(EMPTY_FORM);
    const { query, setQuery, view, sort, toggleSort } = useTableView(users, ['full_name', 'email', 'role']);

    function load() {
        return api('/users')
            .then((d) => setUsers(d.users))
            .catch((e) => setError(e.message));
    }

    useEffect(() => { load(); }, []);

    function updateForm(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    async function createUser() {
        setError('');
        try {
            await api('/users', { method: 'POST', body: JSON.stringify(form) });
            setForm(EMPTY_FORM);
            load();
        } catch (e) {
            setError(e.message);
        }
    }

    async function patchUser(id, body) {
        try {
            await api(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
            load();
        } catch (e) {
            setError(e.message);
        }
    }

    function resetPassword(user) {
        const pwd = window.prompt(`New password for ${user.email} (min 8 chars):`);
        if (pwd === null) {
            return;
        }
        if (pwd.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        setError('');
        patchUser(user.id, { password: pwd });
    }

    function renderRoleOptions() {
        return ROLES.map((role) => (
            <option key={role} value={role}>{role.replace('_', ' ')}</option>
        ));
    }

    function renderStatusPill(isActive) {
        if (isActive) {
            return <span className="pill ok">Active</span>;
        }
        return <span className="pill low">Deactivated</span>;
    }

    function renderRow(user) {
        return (
            <tr key={user.id}>
                <td>{user.full_name}</td>
                <td>{user.email}</td>
                <td>
                    <select
                        value={user.role}
                        onChange={(e) => patchUser(user.id, { role: e.target.value })}
                        style={{ maxWidth: 150 }}
                    >
                        {renderRoleOptions()}
                    </select>
                </td>
                <td>{renderStatusPill(user.is_active)}</td>
                <td>
                    <button
                        className="link"
                        onClick={() => patchUser(user.id, { is_active: !user.is_active })}
                    >
                        {user.is_active ? 'Deactivate' : 'Reactivate'}
                    </button>
                    {' · '}
                    <button className="link" onClick={() => resetPassword(user)}>
                        Reset password
                    </button>
                </td>
            </tr>
        );
    }

    return (
        <>
            <h1>Team access</h1>
            <p className="sub">Add team members and choose which parts of the hub each role can see.</p>

            {error && <div className="banner error">{error}</div>}

            <div className="tile" style={{ marginBottom: 18 }}>
                <h2>Add team member</h2>
                <div className="row">
                    <input
                        placeholder="Full name"
                        value={form.full_name}
                        onChange={(e) => updateForm('full_name', e.target.value)}
                        onKeyDown={onEnter(createUser)}
                    />
                    <input
                        placeholder="Email"
                        type="email"
                        value={form.email}
                        onChange={(e) => updateForm('email', e.target.value)}
                        onKeyDown={onEnter(createUser)}
                    />
                    <input
                        placeholder="Password (min 8 chars)"
                        type="password"
                        value={form.password}
                        onChange={(e) => updateForm('password', e.target.value)}
                        onKeyDown={onEnter(createUser)}
                    />
                    <select
                        value={form.role}
                        onChange={(e) => updateForm('role', e.target.value)}
                        style={{ maxWidth: 160 }}
                    >
                        {renderRoleOptions()}
                    </select>
                    <button className="primary" onClick={createUser} style={{ flex: '0 0 auto' }}>
                        Add
                    </button>
                </div>
            </div>

            {!users ? (
                <p className="empty">Loading…</p>
            ) : (
                <div className="tile">
                    <div className="toolbar">
                        <SearchBox
                            query={query}
                            setQuery={setQuery}
                            placeholder="Search name, email, role…"
                        />
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <SortHeader label="Name" sortKey="full_name" sort={sort} toggleSort={toggleSort} />
                                <SortHeader label="Email" sortKey="email" sort={sort} toggleSort={toggleSort} />
                                <SortHeader label="Role" sortKey="role" sort={sort} toggleSort={toggleSort} />
                                <SortHeader label="Status" sortKey="is_active" sort={sort} toggleSort={toggleSort} />
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {view.length === 0 ? (
                                <tr><td colSpan={5} className="empty">No users match “{query}”.</td></tr>
                            ) : view.map(renderRow)}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}