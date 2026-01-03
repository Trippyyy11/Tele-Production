const mongoose = require('mongoose');
require('dotenv').config();

// Import the models
const { User } = require('./models');

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({});
        console.log(`Found ${users.length} users:`);
        
        for (const user of users) {
            console.log(`- Username: ${user.username}, Role: ${user.role}, Status: ${user.approvalStatus}`);
            
            // Approve the admin if not approved
            if (user.role === 'admin' && user.approvalStatus !== 'approved') {
                await User.updateOne({ _id: user._id }, { approvalStatus: 'approved' });
                console.log(`  ✅ Approved admin user: ${user.username}`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

checkUsers();
