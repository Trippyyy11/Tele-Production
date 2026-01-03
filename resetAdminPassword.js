const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import the models
const { User } = require('./models');

async function resetAdminPassword() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const admin = await User.findOne({ username: 'tpadmin2' });
        if (!admin) {
            console.log('Admin user not found');
            return;
        }

        const newPassword = 'admin123';
        const passwordHash = await bcrypt.hash(newPassword, 10);

        await User.updateOne({ _id: admin._id }, { passwordHash });

        console.log('✅ Admin password reset successfully!');
        console.log('Username: tpadmin2');
        console.log('Password: admin123');
        console.log('Role: admin');
        console.log('Status: approved');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

resetAdminPassword();
