import React, { useState } from 'react';
import { api } from '../api.js';
import { onEnter, useFlash } from '../ui.jsx';

export default function Account() {
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [done, setDone] = useFlash();

    async function submit() {
        setError('');
        setDone('');
        // Confirm the new password was typed the same twice.
        if (next !== confirm) {
            setError('New passwords do not match.');
            return;
        }
        try {
            await api('/auth/password', {
                method: 'POST',
                body: JSON.stringify({ current_password: current, new_password: next }),
            });
            setCurrent('');
            setNext('');
            setConfirm('');
            setDone('Password updated.');
        } catch (e) {
            setError(e.message);
        }
    }

    return (
        <>
            <h1>My account</h1>
            <p className="sub">Change your password.</p>

            {error && <div className="banner error">{error}</div>}
            {done && <div className="banner notice">{done}</div>}

            <div className="tile" style={{ maxWidth: 420 }}>
                <h2>Change password</h2>
                <div className="field">
                    <label htmlFor="current">Current password</label>

                    <input
                        id="current"
                        type="password"
                        value={current}
                        onChange={(e) => setCurrent(e.target.value)}
                        onKeyDown={onEnter(submit)}
                        autoComplete="current-password"
                    />
                </div>
                <div className="field">
                    <label htmlFor="next">New password (min 8 chars)</label>

                    <input
                        id="next"
                        type="password"
                        value={next}
                        onChange={(e) => setNext(e.target.value)}
                        onKeyDown={onEnter(submit)}
                        autoComplete="new-password"
                    />
                </div>
                <div className="field">
                    <label htmlFor="confirm">Confirm new password</label>
                    
                    <input
                        id="confirm"
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        onKeyDown={onEnter(submit)}
                        autoComplete="new-password"
                    />
                </div>
                <button className="primary" onClick={submit}>Update password</button>
            </div>
        </>
    );
}
