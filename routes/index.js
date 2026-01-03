const express = require('express');
const router = express.Router();

const folderRoutes = require('./folderRoutes');
const taskRoutes = require('./taskRoutes');
const entityRoutes = require('./entityRoutes');
const authRoutes = require('./authRoutes');
const accountRoutes = require('./accountRoutes');
const adminRoutes = require('./adminRoutes');
const settingsRoutes = require('./settingsRoutes');

// Mount routes
router.use('/folders', folderRoutes);
router.use('/tasks', taskRoutes);
router.use('/entities', entityRoutes);
router.use('/auth', authRoutes);
router.use('/account', accountRoutes);
router.use('/admin', adminRoutes);
router.use('/settings', settingsRoutes);

// API info
router.get('/', (req, res) => {
    res.json({
        name: 'Telegram Broadcaster API',
        version: '1.0.0',
        endpoints: {
            folders: '/api/folders',
            tasks: '/api/tasks',
            entities: '/api/entities',
            auth: '/api/auth'
        }
    });
});

module.exports = router;
