const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const MONGODB_URI = process.env.MONGODB_URI;

const fixIndexes = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log(`✅ Connected to DB: "${mongoose.connection.name}"`);

        const collection = mongoose.connection.collection('entities');

        console.log('🔍 Listing indexes...');
        const indexes = await collection.indexes();
        console.log('Current Indexes:', JSON.stringify(indexes, null, 2));

        let droppedCount = 0;

        for (const idx of indexes) {
            // Check for the specific problematic index name
            if (idx.name === 'telegramId_1') {
                console.log(`⚠️ Found specific index by name: ${idx.name}`);
                console.log(`🗑️ Dropping index: ${idx.name}...`);
                await collection.dropIndex(idx.name);
                console.log('✅ Index dropped.');
                droppedCount++;
                continue;
            }

            // Also check by key pattern just in case name is different
            // We want to remove any unique index that is JUST telegramId
            if (idx.key.telegramId === 1 && Object.keys(idx.key).length === 1 && idx.unique) {
                console.log(`⚠️ Found unique index by Key: ${idx.name}`);
                console.log(`🗑️ Dropping index: ${idx.name}...`);
                await collection.dropIndex(idx.name);
                console.log('✅ Index dropped.');
                droppedCount++;
            }
        }

        if (droppedCount === 0) {
            console.log('ℹ️ No offending indexes found.');
        } else {
            console.log(`🏁 Dropped ${droppedCount} indexes.`);
        }

    } catch (err) {
        console.error('❌ Error fixing indexes:', err);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

fixIndexes();
