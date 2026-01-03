const express = require('express');
const router = express.Router();
const { Settings, User } = require('../models');
const axios = require('axios');
const { requireAuth, requireRole } = require('../middleware/auth');

// PYTHON SERVICE URL
const PYTHON_AUTH_URL = `${process.env.PYTHON_SERVICE_URL}/auth/setup`;

// Apply authentication middleware to all settings routes
router.use(requireAuth);
router.use(requireRole('admin', 'moderator'));

// POST /api/settings
router.post('/', async (req, res) => {
    try {
        const { apiId, apiHash, botToken } = req.body;

        if (!apiId || !apiHash || !botToken) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Update user's telegram config
        await User.updateOne(
            { _id: req.user._id },
            {
                $set: {
                    'telegramConfig.apiId': String(apiId),
                    'telegramConfig.apiHash': String(apiHash),
                    'telegramConfig.botToken': String(botToken)
                }
            }
        );

        // Delete existing settings for this user to avoid duplicates
        await Settings.deleteMany({ userId: req.user._id });

        // Create new settings
        await Settings.create([
            { userId: req.user._id, key: 'api_id', value: String(apiId) },
            { userId: req.user._id, key: 'api_hash', value: String(apiHash) },
            { userId: req.user._id, key: 'bot_token', value: String(botToken) }
        ]);

        try {
            await axios.post(
                PYTHON_AUTH_URL,
                {
                    api_id: apiId,
                    api_hash: apiHash
                },
                {
                    headers: {
                        'x-user-id': req.user._id.toString()
                    }
                }
            );
            console.log("✅ Python service credentials updated");
        } catch (pyErr) {
            console.error("⚠️ Failed to update Python service:", pyErr.message);
            // Don't fail the request, just warn (user might need to restart python manually if this fails)
        }

        res.json({ message: 'Settings saved successfully' });
    } catch (err) {
        console.error('Settings save failed:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/settings
router.get('/', async (req, res) => {
    try {
        const apiId = await Settings.findOne({ userId: req.user._id, key: 'api_id' });
        const apiHash = await Settings.findOne({ userId: req.user._id, key: 'api_hash' });
        const botToken = await Settings.findOne({ userId: req.user._id, key: 'bot_token' });

        res.json({
            apiId: apiId?.value || '',
            apiHash: apiHash?.value || '',
            botToken: botToken?.value || ''
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
