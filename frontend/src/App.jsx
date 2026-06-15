import React from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { getUser, getToken, clearSession } from './api.js';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Manufacturers from './pages/Manufacturers.jsx';
import ManufacturerDetail from './pages/ManufacturerDetail.jsx';
import Products from './pages/Products.jsx';
import Alerts from './pages/Alerts.jsx';
import ProductionRuns from './pages/ProductionRuns.jsx';
import Users from './pages/Users.jsx';

function RequireAuth({ children }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return children;
}

function Shell({ children }) {
  const user = getUser();
  const navigate = useNavigate();
  const can = (p) => user?.permissions?.includes(p);
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="wordmark">Evolvée Radiance<small>Operations Hub</small></div>
          <nav className="main" aria-label="Main">
            <NavLink to="/" end>Dashboard</NavLink>
            {can('manufacturers') && <NavLink to="/manufacturers">Manufacturers</NavLink>}
            {can('manufacturers') && <NavLink to="/products">Products &amp; thresholds</NavLink>}
            {can('alerts') && <NavLink to="/alerts">Reorder alerts</NavLink>}
            {can('manufacturers') && <NavLink to="/production">Production runs</NavLink>}
            {can('users') && <NavLink to="/users">Team access</NavLink>}
          </nav>
          <div className="userbox">
            <span>{user?.name} · {user?.role?.replace('_', ' ')}</span>
            <button onClick={() => { clearSession(); navigate('/login'); }}>Sign out</button>
          </div>
        </div>
      </header>
      <main className="page">{children}</main>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RequireAuth><Shell><Dashboard /></Shell></RequireAuth>} />
      <Route path="/manufacturers" element={<RequireAuth><Shell><Manufacturers /></Shell></RequireAuth>} />
      <Route path="/manufacturers/:id" element={<RequireAuth><Shell><ManufacturerDetail /></Shell></RequireAuth>} />
      <Route path="/products" element={<RequireAuth><Shell><Products /></Shell></RequireAuth>} />
      <Route path="/alerts" element={<RequireAuth><Shell><Alerts /></Shell></RequireAuth>} />
      <Route path="/production" element={<RequireAuth><Shell><ProductionRuns /></Shell></RequireAuth>} />
      <Route path="/users" element={<RequireAuth><Shell><Users /></Shell></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
