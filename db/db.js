const mongoose = require('mongoose');
const log = require('../utils/logger');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        log(`✅ MongoDB connected successfully to DB: ${mongoose.connection.name}`);

        // SELF-HEALING: Drop incorrect indexes
        try {
            const collection = mongoose.connection.collection('entities');
            const indexes = await collection.indexes();
            const problematicIndex = indexes.find(i => i.name === 'telegramId_1');

            if (problematicIndex) {
                log('⚠️ Found incorrect index "telegramId_1". Dropping it...');
                await collection.dropIndex('telegramId_1');
                log('✅ Dropped "telegramId_1" index successfully.');
            } else {
                log('✅ Index check passed: No "telegramId_1" found.');
            }
        } catch (idxErr) {
            log('⚠️ Index cleanup warning (non-fatal): ' + idxErr.message);
        }

    } catch (err) {
        log('❌ MongoDB connection error: ' + err.message);
        process.exit(1);
    }
};

module.exports = connectDB;