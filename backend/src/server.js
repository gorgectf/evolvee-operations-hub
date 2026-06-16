// Evolvee Radiance Operations Hub — backend entry point.

const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');
const { scheduleStockCheck, runStockCheck } = require('./jobs/stockCheck');

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

// Health check (used by Railway/Render and the troubleshooting guide)
app.get('/api/health', (req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/manufacturers', require('./routes/manufacturers'));
app.use('/api/products', require('./routes/products'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/production-runs', require('./routes/productionRuns'));
app.use('/api/sync', require('./routes/sync'));

app.use((req, res) => {
    res.status(404).json({ error: `No route: ${req.method} ${req.originalUrl}` });
});

app.use(errorHandler);

app.listen(env.port, () => {
    console.log(`Operations Hub backend running on http://localhost:${env.port}`);
    scheduleStockCheck();
    
    // Run one check on startup so alerts appear immediately in a fresh install.
    runStockCheck().catch((err) => {
        console.error('[stock-check] startup run failed:', err.message);
    });
});