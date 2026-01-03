const jwt = require('jsonwebtoken');
require('dotenv').config();

const getJwtSecret = () => {
    return process.env.JWT_SECRET || 'dev-jwt-secret';
};

// Test creating and verifying a token
const testUser = {
    sub: '507f1f77bcf86cd799439011', // dummy user ID
    username: 'tpadmin2',
    role: 'admin'
};

const token = jwt.sign(testUser, getJwtSecret(), { expiresIn: '24h' });
console.log('Generated token:', token);

// Test verification
try {
    const decoded = jwt.verify(token, getJwtSecret());
    console.log('Token verified successfully:', decoded);
} catch (err) {
    console.error('Token verification failed:', err.message);
}
