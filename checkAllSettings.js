const mongoose = require('mongoose');
require('dotenv').config();

// Import the models
const { Settings } = require('./models');

async function checkAllSettings() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find ALL settings documents
        const allSettings = await Settings.find({});
        console.log(`Found ${allSettings.length} total settings documents:`);
        
        for (const setting of allSettings) {
            console.log(`- ID: ${setting._id}, Key: ${setting.key}, UserId: ${setting.userId}, Value: ${setting.value}`);
        }

        // Check for any settings with null/undefined userId
        const orphanedSettings = await Settings.find({ $or: [{ userId: null }, { userId: { $exists: false } }] });
        if (orphanedSettings.length > 0) {
            console.log(`\n⚠️ Found ${orphanedSettings.length} orphaned settings (no userId):`);
            orphanedSettings.forEach(setting => {
                console.log(`- ID: ${setting._id}, Key: ${setting.key}`);
            });
            
            // Delete orphaned settings
            const result = await Settings.deleteMany({ $or: [{ userId: null }, { userId: { $exists: false } }] });
            console.log(`✅ Deleted ${result.deletedCount} orphaned settings`);
        }

        // Check for duplicates across all users
        const duplicates = await Settings.aggregate([
            { $group: { _id: "$key", count: { $sum: 1 }, docs: { $push: "$$ROOT" } } },
            { $match: { count: { $gt: 1 } } }
        ]);
        
        if (duplicates.length > 0) {
            console.log(`\n⚠️ Found duplicate keys across all users:`);
            duplicates.forEach(dup => {
                console.log(`- Key "${dup._id}" appears ${dup.count} times`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

checkAllSettings();
