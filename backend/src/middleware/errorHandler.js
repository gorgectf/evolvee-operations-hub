// Catch-all Express error handler - keeps stack traces out of API responses
// while logging the full error server-side.

function logError(req, errorMessage) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ${req.method} ${req.originalUrl} —`, errorMessage);
}

function resolveErrorMessage(status, originalMessage) {
    if (status === 500) {
        return 'Something went wrong on the server.';
    }
    
    return originalMessage;
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
    logError(req, err.message);

    const status = err.status || 500;
    const responseMessage = resolveErrorMessage(status, err.message);

    res.status(status).json({ error: responseMessage });
}

// Wrap async route handlers so thrown errors reach errorHandler.
function wrapAsyncRoute(routeHandler) {
    function routeWrapper(req, res, next) {
        Promise.resolve(routeHandler(req, res, next)).catch(next);
    }

    return routeWrapper;
}

module.exports = { errorHandler, asyncRoute: wrapAsyncRoute };