const jwt = require('jsonwebtoken');
const { User } = require('../models');

const getJwtSecret = () => {
    return process.env.JWT_SECRET || 'dev-jwt-secret';
};

const requireAuth = async (req, res, next) => {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing Authorization header' });
        }

        const token = header.slice('Bearer '.length).trim();
        const payload = jwt.verify(token, getJwtSecret());

        const user = await User.findById(payload.sub);
        if (!user) {
            return res.status(401).json({ error: 'Invalid token (user not found)' });
        }

        req.user = user;

        User.updateOne({ _id: user._id }, { $set: { lastActiveAt: new Date() } }).catch(() => { });

        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized', detail: err.message });
    }
};

const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
};

const optionalAuth = async (req, res, next) => {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) {
            return next();
        }

        const token = header.slice('Bearer '.length).trim();
        const payload = jwt.verify(token, getJwtSecret());

        const user = await User.findById(payload.sub);
        if (user) {
            req.user = user;
            User.updateOne({ _id: user._id }, { $set: { lastActiveAt: new Date() } }).catch(() => { });
        }
        next();
    } catch (err) {
        // Token invalid or expired - just proceed as unauthenticated
        next();
    }
};

module.exports = { requireAuth, requireRole, optionalAuth };
