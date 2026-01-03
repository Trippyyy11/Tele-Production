const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { Task, Folder } = require('../models');
const multer = require('multer');
const path = require('path');
const { requireAuth, requireRole } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

router.use(requireAuth);

// GET all tasks (history)
router.get('/', async (req, res) => {
    try {
        const tasks = await Task.find()
            .populate('folders', 'name')
            .sort({ createdAt: -1 })
            .limit(100);
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single task by ID
router.get('/:taskId', async (req, res) => {
    try {
        const task = await Task.findOne({ taskId: req.params.taskId })
            .populate('folders', 'name entityIds');

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST schedule new broadcast (Handle optional file upload)
router.post('/schedule', requireRole('admin', 'moderator'), upload.any(), async (req, res) => {
    console.log('🚀 SCHEDULE ROUTE HIT');
    console.log('Headers Content-Type:', req.headers['content-type']);
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const log = (msg) => {
        const entry = `[${new Date().toISOString()}] [ROUTER] ${msg}\n`;
        console.log(msg);
        const logFile = require('path').join(__dirname, '..', 'debug.log');
        require('fs').appendFileSync(logFile, entry);
    };

    try {
        log('--- NEW SCHEDULE REQUEST ---');
        log('Body keys: ' + Object.keys(req.body).join(', '));
        log('Files: ' + (req.files ? req.files.length : 0));

        // Parse fields
        let content = req.body.content;
        if (typeof content === 'string') {
            try { content = JSON.parse(content); } catch (e) { }
        }

        let folderIds = req.body.folderIds; // Still used for recipient count lookup if targetIds not fully populated
        if (typeof folderIds === 'string') {
            try { folderIds = JSON.parse(folderIds); } catch (e) {
                // Try comma separated if not JSON
                if (folderIds.includes(',')) folderIds = folderIds.split(',').map(s => s.trim());
                else if (folderIds.trim().startsWith('[')) folderIds = []; // Partial json failure?
                else folderIds = [folderIds];
            }
        }

        let targetIds = req.body.targetIds;
        if (typeof targetIds === 'string') {
            try { targetIds = JSON.parse(targetIds); } catch (e) { targetIds = []; }
        }

        const { name, type, scheduledAt } = req.body;

        // Map files to messages
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                const url = `/uploads/${file.filename}`;
                // Check fieldname: 'media' (single legacy) or 'media_<id>' (multi)
                if (file.fieldname === 'media') {
                    content.mediaUrl = url;
                } else if (file.fieldname.startsWith('media_')) {
                    const msgId = file.fieldname.replace('media_', '');
                    if (content.messages) {
                        const msg = content.messages.find(m => m.id === msgId);
                        if (msg) {
                            // Initialize mediaUrls if not exists
                            if (!msg.mediaUrls) msg.mediaUrls = [];
                            msg.mediaUrls.push(url);

                            // Set primary mediaUrl for legacy compatibility (first one)
                            if (!msg.mediaUrl) msg.mediaUrl = url;
                        }
                    }
                }
            });
        }

        // Validation
        if (!name) return res.status(400).json({ error: 'Task name is required' });
        if (!type) return res.status(400).json({ error: 'Task type is required' });

        // Count recipients
        // If we have explicit targetIds (from tree or priority), use that count.
        // Otherwise fall back to folders. 
        // Note: targetIds contains Entity IDs (channels/users).
        let recipientCount = 0;
        if (targetIds && targetIds.length > 0) {
            recipientCount = targetIds.length;
        } else if (folderIds && folderIds.length > 0) {
            const folders = await Folder.find({ _id: { $in: folderIds }, userId: req.user._id });
            recipientCount = folders.reduce((sum, f) => sum + f.entityIds.length, 0);
        } else {
            return res.status(400).json({ error: 'No targets selected' });
        }

        // Create task
        const taskId = uuidv4();
        const task = new Task({
            taskId,
            createdBy: req.user._id,
            createdByUsername: req.user.username,
            name,
            type,
            content: content || {},
            folders: folderIds || [],
            targetIds: targetIds || [],
            recipientCount,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            expiryHours: req.body.expiryHours || null,
            status: 'pending'
        });

        await task.save();

        // Add to BullMQ queue for processing
        try {
            const { broadcastQueue, connection } = require('../queues/broadcastQueue');
            const delay = scheduledAt ? new Date(scheduledAt) - Date.now() : 0;

            // If redis is definitely not connected, throw immediately so we can fall back
            if (connection.status !== 'ready' && connection.status !== 'connect' && connection.status !== 'connecting') {
                throw new Error('Redis connection is ' + connection.status);
            }

            // Attempt to add to queue with a timeout
            const addPromise = broadcastQueue.add('broadcast', { taskId }, {
                delay: delay > 0 ? delay : 0,
                removeOnComplete: true
            });

            // If it takes more than 500ms to add, it's likely Redis is hanging
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Queue timeout')), 500));

            await Promise.race([addPromise, timeoutPromise]);

            log(`📝 Task ${taskId} added to queue (delay: ${delay}ms)`);
        } catch (queueErr) {
            log('⚠️ Failed to add to queue: ' + queueErr.message);

            const { processTask } = require('../services/taskProcessor');
            const now = new Date();
            const hasSchedule = !!scheduledAt;
            const scheduledDate = hasSchedule ? new Date(scheduledAt) : null;
            const isImmediate = !hasSchedule || (scheduledDate <= now);

            if (isImmediate) {
                // Fallback: process immediately in-process
                log('🔄 Redis unavailable, processing immediate task directly (in-process)...');
                processTask(taskId).catch(err => log('❌ Direct processing failed: ' + err.message));
            } else {
                // Fallback for scheduled tasks when Redis is not available:
                // schedule an in-memory timer so the feature still works on single-node setups.
                const delayMs = Math.max(0, scheduledDate - now);
                log(`⏰ Redis unavailable, scheduling task in-process with delay ${delayMs}ms...`);

                setTimeout(() => {
                    log(`⏰ In-process scheduler triggering task ${taskId}`);
                    processTask(taskId).catch(err => log('❌ In-process scheduled processing failed: ' + err.message));
                }, delayMs);
            }
        }

        res.status(201).json({
            message: 'Task scheduled successfully',
            task
        });
    } catch (err) {
        const fs = require('fs');
        const path = require('path');
        try { fs.appendFileSync(path.join(__dirname, '..', 'debug_error.log'), `[CRITICAL SCHEDULE] ${err.message}\n${err.stack}\n`); } catch (e) { }
        res.status(500).json({ error: err.message });
    }
});

// POST undo broadcast (delete sent messages)
router.post('/:taskId/undo', requireRole('admin', 'moderator'), async (req, res) => {
    console.log(`🔄 UNDO ROUTE HIT: taskId=${req.params.taskId}, user=${req.user?.username}`);
    try {
        const task = await Task.findOne({ taskId: req.params.taskId });
        if (!task) {
            console.warn(`⚠️ UNDO: Task ${req.params.taskId} not found`);
            return res.status(404).json({ error: 'Task not found' });
        }

        if (!task.sentMessages || task.sentMessages.length === 0) {
            console.warn(`⚠️ UNDO: No sent messages for task ${task.taskId}`);
            return res.status(400).json({ error: 'No sent messages found for this task' });
        }

        const telegramService = require('../services/telegramService');

        // Capture final metrics before deletion
        try {
            console.log(`📊 Syncing final metrics for Task ${task.taskId} before undo...`);
            await telegramService.updateMetrics(task.taskId);
        } catch (e) {
            console.warn(`⚠️ Final metrics sync failed for Task ${task.taskId}: ${e.message}`);
        }

        console.log(`🗑️ Triggering deletion of ${task.sentMessages.length} messages for task ${task.taskId}`);
        const results = await telegramService.deleteMessages(task.createdBy, task.sentMessages);
        console.log(`✅ Deletion results for task ${task.taskId}:`, results);

        // Mark task as undone (Do NOT clear sentMessages to preserve metrics)
        task.status = 'undone';
        task.completedAt = new Date();
        await task.save();

        res.json({
            message: 'Undo request processed',
            results
        });
    } catch (err) {
        console.error(`❌ UNDO ERROR for task ${req.params.taskId}:`, err);
        const fs = require('fs');
        const path = require('path');
        try { fs.appendFileSync(path.join(__dirname, '..', 'debug_error.log'), `[CRITICAL UNDO] ${err.message}\n${err.stack}\n`); } catch (e) { }
        res.status(500).json({ error: err.message });
    }
});

// POST update metrics for a task
router.post('/:taskId/update-metrics', requireRole('admin', 'moderator'), async (req, res) => {
    try {
        const telegramService = require('../services/telegramService');
        const result = await telegramService.updateMetrics(req.params.taskId)
        res.json(result)
    } catch (err) {
        const logFile = require('path').join(__dirname, '..', 'debug.log');
        const entry = `[${new Date().toISOString()}] [ERROR] update-metrics failed: ${err.message}\n${err.stack}\n`;
        try { require('fs').appendFileSync(logFile, entry); } catch (e) { }

        console.error('Metrics update route error:', err);
        res.status(500).json({ error: err.message })
    }
})

// POST retry failed task
router.post('/:taskId/retry', requireRole('admin', 'moderator'), async (req, res) => {
    try {
        const task = await Task.findOne({ taskId: req.params.taskId });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        if (task.status !== 'failed') {
            return res.status(400).json({ error: 'Only failed tasks can be retried' });
        }

        // Reset task state
        task.status = 'pending';
        task.results = { success: 0, failed: 0, errors: [] };
        task.sentMessages = [];
        task.createdAt = new Date(); // Update to show as recent in history
        await task.save();

        // Re-add to queue
        try {
            const { broadcastQueue } = require('../queues/broadcastQueue');
            await broadcastQueue.add('broadcast', { taskId: task.taskId }, {
                removeOnComplete: true
            });
        } catch (queueErr) {
            // Fallback to direct processing if Redis fails
            const { processTask } = require('../services/taskProcessor');
            processTask(task.taskId).catch(err => console.error('Retry processing failed:', err));
        }

        res.json({ message: 'Task retried successfully', task });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE clear task history
router.delete('/history', requireRole('admin', 'moderator'), async (req, res) => {
    try {
        // Delete all tasks
        const result = await Task.deleteMany({});
        res.json({ message: `Deleted ${result.deletedCount} tasks` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
