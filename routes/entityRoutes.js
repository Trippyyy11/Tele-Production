const express = require('express');
const router = express.Router();
const { Entity, Settings } = require('../models');
const telegramService = require('../services/telegramService');
const axios = require('axios');
const { requireAuth, requireRole } = require('../middleware/auth');

const PYTHON_BASE_URL = process.env.PYTHON_SERVICE_URL;

router.use(requireAuth);
router.use(requireRole('admin', 'moderator'));

// GET all entities
router.get('/', async (req, res) => {
    try {
        const { type } = req.query;

        const filter = {
            ownerUserId: req.user._id,
            ...(type ? { type } : {})
        };
        const entities = await Entity.find(filter).sort({ name: 1 });

        res.json(entities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET entity by Telegram ID
router.get('/:telegramId', async (req, res) => {
    try {
        const entity = await Entity.findOne({ ownerUserId: req.user._id, telegramId: req.params.telegramId });

        if (!entity) {
            return res.status(404).json({ error: 'Entity not found' });
        }

        res.json(entity);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST sync from Telegram (fetch dialogs and save)
router.post('/sync-telegram', async (req, res) => {
    console.log("📢 !!! RECEIVED /sync-telegram REQUEST !!!");
    try {
        console.log('📡 Syncing entities from Telegram...');

        // Fetch API credentials for this user
        const apiIdSetting = await Settings.findOne({ userId: req.user._id, key: 'api_id' });
        const apiHashSetting = await Settings.findOne({ userId: req.user._id, key: 'api_hash' });

        if (!apiIdSetting || !apiHashSetting) {
            return res.status(400).json({ error: 'Telegram API credentials not set. Please go to Settings.' });
        }

        // Fetch dialogs from Telegram via Python Service (Source of Truth)
        console.log(`[DEBUG] 📡 Connecting to Python Service at ${PYTHON_BASE_URL}/dialogs...`);
        console.log(`[DEBUG] 🔑 Using Credentials -> API_ID: ${apiIdSetting.value}, API_HASH: ${apiHashSetting.value?.substring(0, 5)}...`);

        const response = await axios.get(`${PYTHON_BASE_URL}/dialogs`, {
            headers: {
                'x-user-id': req.user._id.toString(),
                'x-api-id': apiIdSetting.value,
                'x-api-hash': apiHashSetting.value
            }
        });
        console.log(`[DEBUG] ✅ Received response from Python. Data length: ${response.data?.length}`);
        const dialogs = response.data;

        const results = {
            synced: 0,
            deleted: 0,
            errors: []
        };

        const activeTelegramIds = dialogs.map(d => d.telegramId);

        // Save each dialog to database
        for (const dialog of dialogs) {
            try {
                await Entity.findOneAndUpdate(
                    { ownerUserId: req.user._id, telegramId: dialog.telegramId },
                    {
                        ...dialog,
                        ownerUserId: req.user._id,
                        syncedAt: new Date()
                    },
                    { upsert: true, new: true }
                );
                results.synced++;
            } catch (err) {
                console.error(`[DEBUG] ❌ Failed to save ${dialog.name}:`, err.message);
                results.errors.push(`${dialog.name}: ${err.message}`);
            }
        }

        // Cleanup: Delete entities not in the active list
        const deleteResult = await Entity.deleteMany({
            ownerUserId: req.user._id,
            telegramId: { $nin: activeTelegramIds }
        });
        results.deleted = deleteResult.deletedCount;

        console.log(`✅ Synced ${results.synced} entities, Deleted ${results.deleted} stale entities`);

        res.json({
            message: 'Sync from Telegram completed',
            results
        });
    } catch (err) {
        console.error('❌ Telegram sync error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST sync entities (upsert from frontend)
router.post('/sync', async (req, res) => {
    try {
        const { entities } = req.body;

        if (!entities || !Array.isArray(entities)) {
            return res.status(400).json({ error: 'Entities array is required' });
        }

        const results = {
            created: 0,
            updated: 0,
            errors: []
        };

        for (const entity of entities) {
            try {
                await Entity.findOneAndUpdate(
                    { ownerUserId: req.user._id, telegramId: entity.telegramId },
                    {
                        ...entity,
                        ownerUserId: req.user._id,
                        syncedAt: new Date()
                    },
                    { upsert: true, new: true }
                );
                results.created++;
            } catch (err) {
                results.errors.push(`${entity.telegramId}: ${err.message}`);
            }
        }

        res.json({
            message: 'Sync completed',
            results
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE entity
router.delete('/:telegramId', async (req, res) => {
    try {
        const entity = await Entity.findOneAndDelete({
            ownerUserId: req.user._id,
            telegramId: req.params.telegramId
        });

        if (!entity) {
            return res.status(404).json({ error: 'Entity not found' });
        }

        res.json({ message: 'Entity deleted successfully', entity });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
