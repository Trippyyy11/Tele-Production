const express = require('express');
const { User, Folder, Task } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/approvals', async (req, res) => {
    try {
        const status = req.query.status || 'pending';
        if (!['pending', 'approved', 'denied', 'all'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const query = { role: { $in: ['moderator', 'viewer'] } };
        if (status !== 'all') {
            query.approvalStatus = status;
        }

        const users = await User.find(query)
            .sort({ createdAt: -1 })
            .select('username role approvalStatus createdAt lastActiveAt');

        return res.json(users);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.post('/users/:userId/approve', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.role === 'admin') return res.status(400).json({ error: 'Cannot approve admin' });

        user.approvalStatus = 'approved';
        await user.save();

        return res.json({ message: 'User approved' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.post('/users/:userId/deny', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.role === 'admin') return res.status(400).json({ error: 'Cannot deny admin' });

        user.approvalStatus = 'denied';
        await user.save();

        return res.json({ message: 'User denied' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.get('/users', async (req, res) => {
    try {
        const users = await User.find({})
            .sort({ createdAt: -1 })
            .select('username role approvalStatus createdAt lastActiveAt');

        return res.json(users);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.get('/users/:userId/summary', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('username role approvalStatus createdAt lastActiveAt');
        if (!user) return res.status(404).json({ error: 'User not found' });

        const foldersCount = await Folder.countDocuments({ userId: user._id });
        const tasksCount = await Task.countDocuments({ createdBy: user._id });
        const tasksSentCount = await Task.countDocuments({ createdBy: user._id, status: { $in: ['completed', 'partially_completed'] } });

        const recentTasks = await Task.find({ createdBy: user._id })
            .sort({ createdAt: -1 })
            .limit(25)
            .select('taskId name type status recipientCount scheduledAt createdAt completedAt createdByUsername');

        return res.json({
            user,
            kpis: {
                foldersCount,
                tasksCount,
                tasksSentCount,
                lastActiveAt: user.lastActiveAt
            },
            recentTasks
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.patch('/users/:userId/role', async (req, res) => {
    try {
        const { role } = req.body;
        if (!role || !['admin', 'moderator', 'viewer'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.role === 'admin' && role !== 'admin') {
            return res.status(400).json({ error: 'Cannot change admin role' });
        }

        if (role === 'admin') {
            const existingAdmin = await User.findOne({ role: 'admin' });
            if (existingAdmin && existingAdmin._id.toString() !== user._id.toString()) {
                return res.status(400).json({ error: 'Admin already exists' });
            }
        }

        user.role = role;
        if (role === 'admin') {
            user.approvalStatus = 'approved';
        }

        await user.save();

        return res.json({ message: 'Role updated' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
