const mongoose = require('mongoose');
require('dotenv').config();

async function clearAllUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Delete all users
        const result = await mongoose.connection.db.collection('users').deleteMany({});
        console.log(`Deleted ${result.deletedCount} users`);

        // Optionally delete other collections if you want a fresh start
        const collections = ['folders', 'entities', 'tasks', 'settings'];
        for (const collectionName of collections) {
            const deleteResult = await mongoose.connection.db.collection(collectionName).deleteMany({});
            console.log(`Deleted ${deleteResult.deletedCount} documents from ${collectionName}`);
        }

        console.log('All data cleared successfully');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

clearAllUsers();
