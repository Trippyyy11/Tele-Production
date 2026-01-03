const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'moderator', 'viewer'],
        required: true
    },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'denied'],
        default: 'pending'
    },
    lastActiveAt: {
        type: Date,
        default: null
    },
    telegramConfig: {
        apiId: { type: String, default: '' },
        apiHash: { type: String, default: '' },
        botToken: { type: String, default: '' }
    }
}, {
    timestamps: true
});

const EntitySchema = new mongoose.Schema({
    ownerUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
        required: true
    },
    telegramId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    username: {
        type: String,
        default: null
    },
    type: {
        type: String,
        enum: ['user', 'group', 'channel'],
        required: true
    },
    accessHash: {
        type: String,
        default: null
    },
    syncedAt: {
        type: Date,
        default: Date.now
    }
});

EntitySchema.index({ ownerUserId: 1, telegramId: 1 }, { unique: true });

const FolderSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    description: {
        type: String,
        default: ''
    },
    entityIds: [{
        type: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to ensure folder names are unique per user
FolderSchema.index({ name: 1, userId: 1 }, { unique: true });

// ============================================
// Task Schema (Broadcast jobs)
// ============================================
const TaskSchema = new mongoose.Schema({
    taskId: {
        type: String,
        required: true,
        unique: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    createdByUsername: {
        type: String,
        default: ''
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['message', 'poll', 'multi_message'],
        required: true
    },
    content: {
        text: String,
        mediaUrl: String,
        pollQuestion: String,
        pollOptions: [String],
        correctOption: Number,
        pollExplanation: String,
        // Multi-message support
        messages: [{
            id: String,
            text: String,
            mediaUrl: String, // Single (legacy)
            mediaUrls: [String], // Album support
            type: { type: String }
        }],
        isMulti: { type: Boolean, default: false },
        scheduling: mongoose.Schema.Types.Mixed // Stores { mode, delayMinutes, etc. }
    },
    targetIds: [String], // Ordered list of target entity IDs (for priority)
    folders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Folder'
    }],
    recipientCount: {
        type: Number,
        default: 0
    },
    scheduledAt: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'undone', 'partially_completed', 'expired'],
        default: 'pending'
    },
    results: {
        success: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
        errors: [String]
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date,
        default: null
    },
    expiryHours: {
        type: Number,
        default: null
    },
    sentMessages: [{
        recipientId: String,
        messageId: Number,
        metrics: {
            views: { type: Number, default: 0 },
            forwards: { type: Number, default: 0 },
            replies: { type: Number, default: 0 },
            reactions: { type: Number, default: 0 },
            voters: { type: Number, default: 0 },
            updatedAt: { type: Date, default: Date.now }
        }
    }]
});

// ============================================
// Settings Schema (Global configuration)
// ============================================
const SettingsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    key: {
        type: String,
        required: true,
        index: true
    },
    value: mongoose.Schema.Types.Mixed,
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

SettingsSchema.index({ userId: 1, key: 1 }, { unique: true });

// Create models
const User = mongoose.model('User', UserSchema);
const Entity = mongoose.model('Entity', EntitySchema);
const Folder = mongoose.model('Folder', FolderSchema);
const Task = mongoose.model('Task', TaskSchema);
const Settings = mongoose.model('Settings', SettingsSchema);

module.exports = { User, Entity, Folder, Task, Settings };
