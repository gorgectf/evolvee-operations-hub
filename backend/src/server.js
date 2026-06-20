const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');
const { scheduleStockCheck, runStockCheck } = require('./jobs/stockCheck');
const { ensureSchema } = require('../db/applySchema');
const { seed } = require('../db/seed');

const app = express();

function isAllowedOrigin(origin, callback) {
    if (!origin) {
        return callback(null, true);
    }
    const normalised = origin.replace(/\/+$/, '');
    const allowed = env.corsOrigins.includes(normalised);
    return callback(null, allowed);
}

app.use(cors({ origin: isAllowedOrigin }));
app.use(express.json());

app.get('/api/health', function (req, res) {
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

app.use(function (req, res) {
    res.status(404).json({ error: 'No route: ' + req.method + ' ' + req.originalUrl });
});
app.use(errorHandler);

async function startBackgroundTasks() {
    try {
        await ensureSchema();
        console.log('Database schema ensured (tables present).');
    } catch (err) {
        console.error('Schema check failed on startup:', err.message);
    }

    if (env.autoSeed) {
        try {
            await seed();
        } catch (err) {
            console.error('Auto-seed failed on startup:', err.message);
        }
    }

    scheduleStockCheck();

    runStockCheck().catch(function (err) {
        console.error('[stock-check] startup run failed:', err.message);
    });
}

app.listen(env.port, function () {
    console.log('Operations Hub backend running on port ' + env.port);
    startBackgroundTasks();
});