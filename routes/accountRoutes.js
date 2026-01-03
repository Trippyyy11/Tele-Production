const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { requireAuth } = require('../middleware/auth');
const log = require('../utils/logger');

const router = express.Router();

const getJwtSecret = () => {
    return process.env.JWT_SECRET;
};

const signToken = (user) => {
    return jwt.sign(
        {
            sub: user._id.toString(),
            username: user.username,
            role: user.role
        },
        getJwtSecret(),
        { expiresIn: '24h' }
    );
};

router.post('/signup', async (req, res) => {
    try {
        const { username, password, role } = req.body;

        if (!username || !password || !role) {
            return res.status(400).json({ error: 'username, password, role are required' });
        }

        if (!['admin', 'moderator', 'viewer'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const existing = await User.findOne({ username });
        if (existing) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        if (role === 'admin') {
            const existingAdmin = await User.findOne({ role: 'admin' });
            if (existingAdmin) {
                return res.status(400).json({ error: 'Admin already exists' });
            }
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const approvalStatus = role === 'admin' ? 'approved' : 'pending';

        const user = await User.create({
            username,
            passwordHash,
            role,
            approvalStatus
        });

        if (user.approvalStatus !== 'approved') {
            return res.status(201).json({
                status: 'pending_approval',
                message: 'Signup successful. Awaiting admin approval.'
            });
        }

        const token = signToken(user);

        return res.status(201).json({
            token,
            user: {
                id: user._id.toString(),
                username: user.username,
                role: user.role,
                approvalStatus: user.approvalStatus
            }
        });
    } catch (err) {
        log(err)
        return res.status(500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'username and password are required' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.approvalStatus !== 'approved') {
            return res.status(403).json({ error: 'Account not approved', approvalStatus: user.approvalStatus });
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = signToken(user);

        return res.json({
            token,
            user: {
                id: user._id.toString(),
                username: user.username,
                role: user.role,
                approvalStatus: user.approvalStatus
            }
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: err.message });
    }
});

router.get('/me', requireAuth, async (req, res) => {
    const user = req.user;
    return res.json({
        id: user._id.toString(),
        username: user.username,
        role: user.role,
        approvalStatus: user.approvalStatus,
        lastActiveAt: user.lastActiveAt,
        telegramConfigured: !!(user.telegramConfig?.apiId && user.telegramConfig?.apiHash && user.telegramConfig?.botToken)
    });
});

module.exports = router;
