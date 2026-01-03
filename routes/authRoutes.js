const express = require('express');
const router = express.Router();
const axios = require('axios');
const { Settings } = require('../models');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');

const PYTHON_BASE_URL = process.env.PYTHON_SERVICE_URL;

// GET /api/auth/status - Public endpoint to check Telegram connection status (with optional user context)
router.get('/status', optionalAuth, async (req, res) => {
    try {
        // Check Python Service Status with User Context
        let pythonStatus = { configured: false, authorized: false, service: false };
        try {
            const headers = req.user ? { 'x-user-id': req.user._id.toString() } : {};
            const pyRes = await axios.get(`${PYTHON_BASE_URL}/`, { headers });
            pythonStatus = pyRes.data;
        } catch (e) {
            console.log("Python service unreachable");
        }

        // If user is authenticated, check their specific config
        let userConfigured = false;
        if (req.user) {
            userConfigured = !!(req.user.telegramConfig?.apiId && req.user.telegramConfig?.apiHash && req.user.telegramConfig?.botToken);
        }

        res.json({
            connected: pythonStatus.authorized, // True if user is logged in
            configured: userConfigured || pythonStatus.configured, // True if API Keys exist
            serviceRunning: !!pythonStatus.service,
            user: pythonStatus.user, // Return user info from Python service
            ...pythonStatus // inclusive of other potential fields
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/send-code - Public endpoint for phone login (requires user context)
router.post('/send-code', async (req, res) => {
    try {
        // For phone login, we need a user context but not necessarily full auth
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Authentication required for phone login' });
        }

        // Verify the token to get user context
        const token = authHeader.slice('Bearer '.length).trim();
        const jwt = require('jsonwebtoken');
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-jwt-secret');

        const { User } = require('../models');
        const user = await User.findById(payload.sub);
        if (!user) {
            return res.status(401).json({ error: 'Invalid user context' });
        }

        // Check if user has required role
        if (!['admin', 'moderator'].includes(user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions for Telegram login' });
        }

        const { phoneNumber } = req.body;
        console.log(`📱 Requesting code for ${phoneNumber} via Python Service...`);

        // Prepare headers with API credentials if available
        const headers = { 'x-user-id': user._id.toString() };
        if (user.telegramConfig?.apiId && user.telegramConfig?.apiHash) {
            headers['x-api-id'] = user.telegramConfig.apiId;
            headers['x-api-hash'] = user.telegramConfig.apiHash;
        }

        const response = await axios.post(
            `${PYTHON_BASE_URL}/auth/request-code`,
            { phone: phoneNumber },
            { headers }
        );
        res.json(response.data);
    } catch (err) {
        console.error('Failed to send code:', err.response?.data || err.message);
        res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
    }
});

// POST /api/auth/sign-in - Public endpoint for phone login (requires user context)
router.post('/sign-in', async (req, res) => {
    try {
        // For phone login, we need a user context but not necessarily full auth
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Authentication required for phone login' });
        }

        // Verify the token to get user context
        const token = authHeader.slice('Bearer '.length).trim();
        const jwt = require('jsonwebtoken');
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-jwt-secret');

        const { User } = require('../models');
        const user = await User.findById(payload.sub);
        if (!user) {
            return res.status(401).json({ error: 'Invalid user context' });
        }

        // Check if user has required role
        if (!['admin', 'moderator'].includes(user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions for Telegram login' });
        }

        console.log(`🔐 Signing in...`);
        console.log('Request body:', JSON.stringify(req.body, null, 2));

        // Prepare headers with API credentials if available
        const headers = { 'x-user-id': user._id.toString() };
        if (user.telegramConfig?.apiId && user.telegramConfig?.apiHash) {
            headers['x-api-id'] = user.telegramConfig.apiId;
            headers['x-api-hash'] = user.telegramConfig.apiHash;
        }

        const response = await axios.post(`${PYTHON_BASE_URL}/auth/sign-in`, req.body, { headers });

        res.json(response.data);
    } catch (err) {
        console.error('Sign in failed:', err.response?.data || err.message);
        res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
    }
});

// Apply authentication middleware to remaining routes
router.use(requireAuth);

// POST /api/auth/logout
router.post('/logout', requireRole('admin', 'moderator'), async (req, res) => {
    try {
        console.log(`🔓 Logging out...`);
        const response = await axios.post(`${PYTHON_BASE_URL}/auth/logout`, null, {
            headers: { 'x-user-id': req.user._id.toString() }
        });
        res.json(response.data);
    } catch (err) {
        console.error('Logout failed:', err.response?.data || err.message);
        res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
    }
});

module.exports = router;

