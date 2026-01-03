require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Routes
const apiRoutes = require('./routes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const connectDB = require('./db/db');
const log = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Middleware (Security)
// 1. CORS (Strict Origin) - Must be first
app.use(cors({
    origin: [process.env.FRONTEND_URL]
}));

app.use(express.json({ limit: '10kb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 5. Rate Limiting (DISABLED)
// const rateLimit = require('express-rate-limit');
// const limiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 mins
//     max: 100, // Limit each IP to 100 requests per window
//     standardHeaders: true,
//     legacyHeaders: false,
// });
// app.use('/api', limiter);

// Routes // [NEW]
app.use('/api', apiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);


// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const startServer = async () => {
    await connectDB();

    // Start BullMQ worker (optional - requires Redis)
    try {
        require('./queues/worker');
        require('./queues/analyticsWorker');
        log('✅ Background worker started');
    } catch (err) {
        log('⚠️ Worker not started (Redis may not be running): ' + err.message);
    }

    // Start Expiry Service (Polling - No Redis required)
    try {
        const { initExpiryService } = require('./services/expiryService');
        initExpiryService();
        log('✅ Expiry service started');
    } catch (err) {
        log('❌ Failed to start expiry service: ' + err.message);
    }

    app.listen(PORT, () => {
        log(`🚀 Server running on PORT: ${PORT}`);
    });
};

// Prevent crash on unhandled rejections (e.g. Redis connection failure)
// process.on('unhandledRejection', (reason, promise) => {
//     log('❌ Unhandled Rejection at:', promise, 'reason:', reason);
//     // Application specific logging, throwing an error, or other logic here
// });

// process.on('uncaughtException', (err) => {
//     log('❌ Uncaught Exception thrown:', err);
// });

startServer();
