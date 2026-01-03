const mongoose = require('mongoose');
require('dotenv').config();

async function resetSettings() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Drop the entire settings collection to clear all indexes
        await mongoose.connection.db.dropCollection('settings');
        console.log('✅ Dropped settings collection');

        // Import models to recreate indexes
        const { Settings } = require('./models');
        
        // Create the collection with proper indexes
        await Settings.createIndexes();
        console.log('✅ Recreated settings collection with proper indexes');

        // Verify the indexes
        const indexes = await Settings.collection.getIndexes();
        console.log('Current indexes:', Object.keys(indexes));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

resetSettings();
