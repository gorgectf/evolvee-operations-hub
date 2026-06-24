import React from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate, Outlet } from 'react-router-dom';
import { getUser, getToken, clearSession } from './api.js';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Manufacturers from './pages/Manufacturers.jsx';
import ManufacturerDetail from './pages/ManufacturerDetail.jsx';
import Products from './pages/Products.jsx';
import Alerts from './pages/Alerts.jsx';
import ProductionRuns from './pages/ProductionRuns.jsx';
import Users from './pages/Users.jsx';
import Account from './pages/Account.jsx';

function Shell() {
    const user = getUser();
    const navigate = useNavigate();
    const can = (p) => user?.permissions?.includes(p);

    if (!getToken()) {
        return <Navigate to="/login" replace />;
    }

    return (
        <>
            <header className="topbar">
                <div className="topbar-inner">
                    <div className="wordmark">
                        Evolvée Radiance
                        <small>Operations Hub</small>
                    </div>
                    <nav className="main" aria-label="Main">
                        <NavLink to="/" end>
                            Dashboard
                        </NavLink>
                        {can('manufacturers') && (
                            <NavLink to="/manufacturers">
                                Manufacturers
                            </NavLink>
                        )}
                        {can('manufacturers') && (
                            <NavLink to="/products">
                                Products &amp; thresholds
                            </NavLink>
                        )}
                        {can('alerts') && (
                            <NavLink to="/alerts">
                                Reorder alerts
                            </NavLink>
                        )}
                        {can('manufacturers') && (
                            <NavLink to="/production">
                                Production runs
                            </NavLink>
                        )}
                        {can('users') && (
                            <NavLink to="/users">
                                Team access
                            </NavLink>
                        )}
                    </nav>
                    <div className="userbox">
                        <span>
                            {user?.name} · {user?.role?.replace('_', ' ')}
                        </span>
                        <NavLink to="/account">Account</NavLink>
                        <button
                            onClick={() => {
                                clearSession();
                                navigate('/login');
                            }}
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </header>
            <main className="page">
                <Outlet />
            </main>
        </>
    );
}

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Shell />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/manufacturers" element={<Manufacturers />} />
                <Route path="/manufacturers/:id" element={<ManufacturerDetail />} />
                <Route path="/products" element={<Products />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/production" element={<ProductionRuns />} />
                <Route path="/users" element={<Users />} />
                <Route path="/account" element={<Account />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
