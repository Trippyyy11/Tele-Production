const mongoose = require('mongoose');
require('dotenv').config();

// Import the models
const { User, Settings } = require('./models');

async function fixSettings() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get all users
        const users = await User.find({});
        console.log(`Found ${users.length} users`);

        for (const user of users) {
            console.log(`\nProcessing user: ${user.username} (${user._id})`);
            
            // Find all settings for this user
            const userSettings = await Settings.find({ userId: user._id });
            console.log(`Found ${userSettings.length} settings for user`);
            
            // Group by key to find duplicates
            const settingsByKey = {};
            userSettings.forEach(setting => {
                if (!settingsByKey[setting.key]) {
                    settingsByKey[setting.key] = [];
                }
                settingsByKey[setting.key].push(setting);
            });
            
            // Remove duplicates, keep the latest one
            for (const [key, settings] of Object.entries(settingsByKey)) {
                if (settings.length > 1) {
                    console.log(`  Found ${settings.length} duplicates for key: ${key}`);
                    
                    // Sort by updatedAt (latest first)
                    settings.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                    
                    // Keep the first (latest) one, delete the rest
                    const toKeep = settings[0];
                    const toDelete = settings.slice(1);
                    
                    console.log(`  Keeping: ${toKeep._id} (updated: ${toKeep.updatedAt})`);
                    console.log(`  Deleting: ${toDelete.map(s => s._id).join(', ')}`);
                    
                    await Settings.deleteMany({ _id: { $in: toDelete.map(s => s._id) } });
                    console.log(`  ✅ Deleted ${toDelete.length} duplicates`);
                } else {
                    console.log(`  Key ${key}: OK (no duplicates)`);
                }
            }
        }

        console.log('\n✅ Settings cleanup completed');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

fixSettings();
