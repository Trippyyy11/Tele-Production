const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndexes() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('settings');

        // Drop the problematic key_1 index (unique on key only)
        try {
            await collection.dropIndex('key_1');
            console.log('✅ Dropped problematic key_1 index');
        } catch (err) {
            console.log('key_1 index not found or already dropped');
        }

        // Verify remaining indexes
        const indexes = await collection.indexInformation();
        console.log('Remaining indexes:', Object.keys(indexes));
        
        Object.entries(indexes).forEach(([name, index]) => {
            console.log(`- ${name}: ${JSON.stringify(index.key)}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

fixIndexes();
