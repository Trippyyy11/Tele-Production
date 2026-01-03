const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');

// GET /api/analytics/export
router.get('/export', async (req, res) => {
    try {
        const csv = await analyticsService.exportAnalytics();
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=broadcast-analytics.csv');
        // Add BOM for Excel compatibility
        res.send('\uFEFF' + csv);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/analytics/:taskId
router.get('/:taskId', async (req, res) => {
    try {
        const data = await analyticsService.getTaskAnalytics(req.params.taskId);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/analytics/growth
router.post('/growth', async (req, res) => {
    try {
        const { channelId, days } = req.body;
        // Proxy to Python Service
        const axios = require('axios');
        const pythonUrl = `${process.env.PYTHON_SERVICE_URL}/analytics/growth`;

        const response = await axios.post(pythonUrl, {
            channel_id: channelId,
            days: days || 30
        });

        res.json(response.data);
    } catch (err) {
        console.error("Growth Analytics Error:", err.response?.data || err.message);
        res.status(500).json({ error: err.response?.data?.detail || err.message });
    }
});

module.exports = router;
