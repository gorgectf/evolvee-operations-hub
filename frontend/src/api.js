// API base URL; empty means same origin.
const BASE = import.meta.env.VITE_API_BASE || '';

// localStorage keys for the saved session.
const TOKEN_KEY = 'opshub_token';
const USER_KEY = 'opshub_user';

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

export function getUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch {
        // Stored value isn't valid JSON.
        return null;
    }
}

// fetch wrapper: prefixes /api, adds JSON and auth headers, normalises errors.
export async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json' };

    if (options.headers) {
        Object.assign(headers, options.headers);
    }

    const token = getToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE}/api${path}`, { ...options, headers });

    // Read the JSON body if there is one.
    let data = null;
    try {
        data = await response.json();
    } catch {
        data = null;
    }

    // Token rejected: sign out and go back to login.
    if (response.status === 401) {
        clearSession();
        window.location.href = '/login';
        throw new Error('Signed out');
    }

    // Any other failure: use the server's message if it sent one.
    if (!response.ok) {
        throw new Error(data?.error || `Request failed (${response.status})`);
    }

    if (data === null && response.status !== 204) {
        throw new Error('Server did not return JSON — check VITE_API_BASE points to the backend.');
    }

    return data;
}