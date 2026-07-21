function alertSeverity(stockLevel, threshold) {
    const stock = Number(stockLevel);
    const thr = Number(threshold);
    const deficit = thr - stock;
    const pctBelow = thr > 0 ? deficit / thr : 1;
    const severity = stock <= 0 || pctBelow >= 0.5 ? 'critical' : 'warning';

    return { deficit, pct_below: pctBelow, severity };
}

function annotate(alert) {
    return Object.assign({}, alert, alertSeverity(alert.stock_level, alert.threshold));
}

function triggeredMs(alert) {
    const t = new Date(alert.triggered_at).getTime();
    return Number.isNaN(t) ? 0 : t;
}

function sortBySeverity(list) {
    return (list || [])
        .map(annotate)
        .sort((a, b) =>
            b.pct_below - a.pct_below ||
            b.deficit - a.deficit ||
            triggeredMs(b) - triggeredMs(a)
        );
}

module.exports = { alertSeverity, sortBySeverity };
