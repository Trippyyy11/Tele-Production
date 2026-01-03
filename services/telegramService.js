const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Settings, User, Task } = require('../models');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Configuration
const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const botToken = process.env.BOT_TOKEN;

// Session storage (In memory for now, session string will be persisted to database)
let sessionString = null; // Initialize as null to force DB check
let client = null;

/**
 * Get or create Telegram client
 * @param {string} customSession Optional session string to override
 */
const getClient = async (customSession = null) => {
    // 1. Try to load session from Source of Truth (Database or Memory)
    if (!customSession && !sessionString) {
        const dbSession = await Settings.findOne({ key: 'telegram_session' });
        if (dbSession && dbSession.value) {
            sessionString = dbSession.value;
            console.log('📦 Loaded Telegram User session from database');
        } else if (process.env.TELEGRAM_SESSION) {
            sessionString = process.env.TELEGRAM_SESSION;
            console.log('📦 Loaded Telegram User session from .env');
        }
    }

    const activeSession = customSession || sessionString;

    // 2. If we have an active client already, reuse it
    if (client && client.connected && !customSession) {
        return client;
    }

    // 3. Disconnect old client if we are establishing a new one
    if (client) {
        try { await client.disconnect(); } catch (e) { }
    }

    // 4. Case A: Establish User Client (Prioritized for Analytics/Dialogs)
    if (activeSession) {
        client = new TelegramClient(new StringSession(activeSession), apiId, apiHash, {
            connectionRetries: 5,
        });
        await client.connect();
        return client;
    }

    // 5. Case B: Establish Bot Client (Fallback for basic metadata if no user logged in)
    if (botToken) {
        client = new TelegramClient(new StringSession(""), apiId, apiHash, {
            connectionRetries: 5,
        });
        await client.start({
            botAuthToken: botToken.trim(),
        });
        return client;
    }

    // 6. Case C: Empty client
    client = new TelegramClient(new StringSession(""), apiId, apiHash, {
        connectionRetries: 5,
    });
    return client;
};

const getUserBotToken = async (userId) => {
    // Priority 1: User-specific configuration in User model
    if (userId) {
        const user = await User.findById(userId).select('telegramConfig');
        const direct = user?.telegramConfig?.botToken;
        if (direct && direct.trim()) return String(direct).trim();
    }

    // Priority 2: User-specific configuration in Settings model
    if (userId) {
        const fromSettings = await Settings.findOne({ userId, key: 'bot_token' });
        if (fromSettings?.value && String(fromSettings.value).trim()) return String(fromSettings.value).trim();
    }

    // Priority 3: Global environment variable
    return botToken || process.env.BOT_TOKEN || '';
};

/**
 * Step 1: Send verification code to phone number
 */
const sendCode = async (phoneNumber) => {
    // ... existing implementation ...
    const tempClient = new TelegramClient(new StringSession(""), apiId, apiHash, {
        connectionRetries: 5,
    });
    await tempClient.connect();

    const { phoneCodeHash } = await tempClient.sendCode(
        { apiId, apiHash },
        phoneNumber
    );

    client = tempClient;
    return phoneCodeHash;
};

/**
 * Step 2: Sign in with the verification code
 */
const signIn = async (phoneNumber, phoneCodeHash, phoneCode) => {
    if (!client) {
        // Should rely on temp client from sendCode, or create new one
        client = new TelegramClient(new StringSession(""), apiId, apiHash, {
            connectionRetries: 5,
        });
        await client.connect();
    }

    try {
        await client.invoke(new Api.auth.SignIn({
            phoneNumber: phoneNumber,
            phoneCodeHash: phoneCodeHash,
            phoneCode: phoneCode,
        }));

        // Save session
        sessionString = client.session.save();

        // Persist to DB
        await Settings.findOneAndUpdate(
            { key: 'telegram_session' },
            { value: sessionString },
            { upsert: true, new: true }
        );

        console.log('✅ User signed in successfully');
        return sessionString;
    } catch (err) {
        console.error('Sign in error:', err);
        throw err;
    }
};

/**
 * Check connection status and return user/bot info
 */
const getStatus = async () => {
    try {
        const client = await getClient();
        if (!client && !botToken) return { connected: false, error: "No session or token found" };

        if (client && !client.connected) await client.connect();

        const me = await client.getMe();
        const isUserSession = !!sessionString || !!process.env.TELEGRAM_SESSION;

        if (!me) {
            return {
                connected: false,
                mode: isUserSession ? 'User (Session present but invalid)' : 'Anonymous',
                botApiStatus: !!botToken ? 'Configured' : 'Missing'
            };
        }

        return {
            connected: true,
            user: {
                firstName: me.firstName,
                lastName: me.lastName,
                username: me.username,
                phone: me.phone,
                id: me.id.toString(),
                isBot: me.bot || false
            },
            mode: isUserSession ? 'User (Permanent)' : 'Bot (Limited)',
            botApiStatus: !!botToken ? 'Configured' : 'Missing'
        };
    } catch (err) {
        console.error('Status check failed:', err.message);
        return { connected: false, error: err.message };
    }
};

/**
 * Send broadcast messages or polls via Bot API (more reliable for groups)
 */
const sendBroadcast = async (userId, recipientIds, type, content, scheduling = {}) => {
    if (Array.isArray(userId)) {
        // Legacy support (should be avoided now)
        content = type;
        type = recipientIds;
        recipientIds = userId;
        userId = null;
    }

    const results = {
        success: 0,
        failed: 0,
        errors: [],
        sentMessages: []
    };

    const resolvedBotToken = await getUserBotToken(userId);
    if (!resolvedBotToken) {
        throw new Error("BOT_TOKEN is missing. Bot API sending requires a token.");
    }

    const trimmedToken = resolvedBotToken.trim();
    const baseUrl = `https://api.telegram.org/bot${trimmedToken}`;
    const fs = require('fs');
    const path = require('path');

    // Determine messages to send
    let messagesToSend = [];
    if (content.messages && Array.isArray(content.messages) && content.messages.length > 0) {
        messagesToSend = content.messages;
    } else {
        // Normalize single message to array (Legacy support)
        messagesToSend = [{
            type: type, // 'message' or 'poll'
            text: content.text,
            mediaUrl: content.mediaUrl,
            // Poll fields
            pollQuestion: content.pollQuestion,
            pollOptions: content.pollOptions,
            correctOption: content.correctOption,
            pollExplanation: content.pollExplanation
        }];
    }

    // Determine delay
    let delayMs = 2000; // Default 2s
    if (scheduling && scheduling.mode === 'delay' && scheduling.delayMinutes) {
        delayMs = scheduling.delayMinutes * 60 * 1000;
        console.log(`⏱️ Using configured delay of ${scheduling.delayMinutes} minutes (${delayMs}ms) between recipients`);
    }

    for (let i = 0; i < recipientIds.length; i++) {
        const recipientId = recipientIds[i];

        try {
            // Send all messages in the sequence to this recipient
            for (const msg of messagesToSend) {
                let endpoint;
                let payload = {
                    chat_id: recipientId,
                    parse_mode: 'HTML'
                };
                let isMultipart = false;
                let formData = null;

                // Determine effective type for this message
                let msgType = msg.type || type || 'message';
                if (msgType === 'multi_message') msgType = 'message';

                if (msgType === 'message') {
                    // Check for multiple media (Album)
                    if (msg.mediaUrls && msg.mediaUrls.length > 1) {
                        endpoint = `${baseUrl}/sendMediaGroup`;
                        const mediaGroup = [];
                        formData = new FormData();
                        formData.append('chat_id', recipientId);

                        for (let mIdx = 0; mIdx < msg.mediaUrls.length; mIdx++) {
                            const mediaUrl = msg.mediaUrls[mIdx];
                            const relativeMediaUrl = mediaUrl.startsWith('/') ? mediaUrl.slice(1) : mediaUrl;
                            const filePath = path.join(__dirname, '..', relativeMediaUrl);

                            if (fs.existsSync(filePath)) {
                                const ext = path.extname(filePath).toLowerCase();
                                let type = 'document'; // Default fallback
                                if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) type = 'photo';
                                else if (['.mp4', '.mov'].includes(ext)) type = 'video';

                                const fileName = path.basename(filePath);
                                // Unique field name for formdata
                                const fieldName = `file${mIdx}`;

                                const mediaItem = {
                                    type: type,
                                    media: `attach://${fieldName}`
                                };

                                // Caption only on first item (Telegram API rule)
                                if (mIdx === 0 && msg.text) {
                                    mediaItem.caption = msg.text;
                                    mediaItem.parse_mode = 'HTML';
                                }

                                mediaGroup.push(mediaItem);

                                const blob = await fs.openAsBlob(filePath);
                                formData.append(fieldName, blob, fileName);
                            }
                        }

                        if (mediaGroup.length > 0) {
                            formData.append('media', JSON.stringify(mediaGroup));
                            isMultipart = true;
                        } else {
                            // Fallback if all files failed
                            endpoint = `${baseUrl}/sendMessage`;
                            payload.text = (msg.text || '') + "\n\n(Error: Album files not found)";
                        }

                    } else if (msg.mediaUrl || (msg.mediaUrls && msg.mediaUrls.length === 1)) {
                        // Single Media Logic (Existing)
                        const rawUrl = msg.mediaUrl || msg.mediaUrls[0];
                        const relativeMediaUrl = rawUrl.startsWith('/') ? rawUrl.slice(1) : rawUrl;
                        const filePath = path.join(__dirname, '..', relativeMediaUrl);

                        if (fs.existsSync(filePath)) {
                            const ext = path.extname(filePath).toLowerCase();
                            let mediaType = 'document';
                            let fieldName = 'document';

                            const stats = fs.statSync(filePath);
                            const fileSizeInBytes = stats.size;
                            const ONE_MB = 1024 * 1024;
                            const MAX_PHOTO_SIZE = 10 * ONE_MB;

                            if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
                                if (fileSizeInBytes > MAX_PHOTO_SIZE) {
                                    mediaType = 'document';
                                    fieldName = 'document';
                                } else {
                                    mediaType = 'photo';
                                    fieldName = 'photo';
                                }
                            } else if (['.mp4', '.mov', '.avi'].includes(ext)) {
                                mediaType = 'video';
                                fieldName = 'video';
                            }

                            endpoint = `${baseUrl}/send${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}`;

                            formData = new FormData();
                            formData.append('chat_id', recipientId);
                            formData.append('caption', msg.text || '');
                            formData.append('parse_mode', 'HTML');

                            const blob = await fs.openAsBlob(filePath);
                            formData.append(fieldName, blob, path.basename(filePath));
                            isMultipart = true;
                        } else {
                            endpoint = `${baseUrl}/sendMessage`;
                            payload.text = (msg.text || '') + "\n\n(Error: Media file not found)";
                        }
                    } else {
                        endpoint = `${baseUrl}/sendMessage`;
                        payload.text = msg.text || '';
                    }
                } else if (msgType === 'poll') {
                    endpoint = `${baseUrl}/sendPoll`;
                    payload.question = msg.pollQuestion || content.pollQuestion;
                    payload.options = JSON.stringify(msg.pollOptions || content.pollOptions);
                    payload.is_anonymous = true;
                    payload.type = 'quiz';
                    payload.correct_option_id = msg.correctOption !== undefined ? msg.correctOption : content.correctOption;
                    payload.explanation = msg.pollExplanation || content.pollExplanation || "";
                }

                console.log(`📡 Bot API: Sending ${msgType} to ${recipientId}...`);

                let res;
                if (isMultipart) {
                    res = await fetch(endpoint, { method: 'POST', body: formData });
                } else {
                    res = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                }

                const data = await res.json();

                if (data.ok) {
                    // SendMediaGroup returns array of messages, others return single message object
                    const messageId = Array.isArray(data.result) ? data.result[0].message_id : data.result.message_id;
                    console.log(`✅ Bot API Success: ${recipientId}, msgId: ${messageId}`);
                    results.success++;
                    results.sentMessages.push({
                        recipientId: recipientId.toString(),
                        messageId: messageId
                    });
                } else {
                    console.error(`❌ Bot API Error for ${recipientId}: ${data.description} (Code: ${data.error_code})`);
                    throw new Error(data.description);
                }

                // Small delay between messages in the same batch (e.g. 500ms)
                if (messagesToSend.length > 1) await new Promise(r => setTimeout(r, 500));
            }

            // End of message loop for this recipient
        } catch (err) {
            results.failed++;
            const errorMsg = `Failed to send to ${recipientId}: ${err.message}`;
            results.errors.push(errorMsg);
            console.error(errorMsg);
        }

        // Delay between recipients (only if NOT the last one)
        if (i < recipientIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    return results;
};

/**
 * Delete specific messages (Undo/Expiry)
 */
const deleteMessages = async (userId, messages) => {
    if (Array.isArray(userId)) {
        messages = userId;
        userId = null;
    }

    const results = { success: 0, failed: 0, errors: [] };
    const logFile = path.join(__dirname, '..', 'debug.log');

    const logDebug = (msg) => {
        const entry = `[${new Date().toISOString()}] [UNDO] ${msg}\n`;
        try { fs.appendFileSync(logFile, entry); } catch (e) { }
        console.log(`[UNDO] ${msg}`);
    };

    try {
        const token = await getUserBotToken(userId);
        if (!token) {
            logDebug("❌ Error: No BOT_TOKEN found (neither user-specific nor global)");
            throw new Error("BOT_TOKEN is missing. Bot API deletion requires a token.");
        }

        const baseUrl = `https://api.telegram.org/bot${token.trim()}`;
        logDebug(`🔄 Starting deletion of ${messages.length} messages using token ending in ...${token.slice(-5)}`);

        // Bot API requires individual deleteMessage calls
        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            const recipientId = msg.recipientId;
            const messageId = parseInt(msg.messageId);

            if (!recipientId || isNaN(messageId)) {
                results.failed++;
                results.errors.push(`Invalid message data: recipientId=${recipientId}, messageId=${messageId}`);
                logDebug(`⚠️ Skipping invalid message: ${JSON.stringify(msg)}`);
                continue;
            }

            try {
                const response = await axios.post(`${baseUrl}/deleteMessage`, {
                    chat_id: recipientId,
                    message_id: messageId
                });

                const data = response.data;

                if (data.ok) {
                    results.success++;
                    logDebug(`✅ Deleted message ${messageId} in ${recipientId}`);
                } else {
                    results.failed++;
                    results.errors.push(`${recipientId}: ${data.description}`);
                    logDebug(`❌ Telegram Error for msg ${messageId} in ${recipientId}: ${data.description}`);
                }
            } catch (err) {
                results.failed++;
                const errorDesc = err.response?.data?.description || err.message;
                results.errors.push(`${recipientId}: ${errorDesc}`);
                logDebug(`❌ Axios error for msg ${messageId} in ${recipientId}: ${errorDesc}`);
            }

            // Protective delay to avoid rate limits (200ms)
            if (i < messages.length - 1) {
                await new Promise(r => setTimeout(r, 200));
            }
        }

        logDebug(`🏁 Deletion process finished. Success: ${results.success}, Failed: ${results.failed}`);
        return results;
    } catch (err) {
        logDebug(`❌ CRITICAL: Delete messages process failed: ${err.message}`);
        throw err;
    }
};

/**
 * Fetch all dialogs (contacts, groups, channels)
 */
const fetchDialogs = async () => {
    try {
        const client = await getClient();
        if (!client.connected) await client.connect();

        const dialogs = await client.getDialogs();

        return dialogs.map(dialog => ({
            telegramId: dialog.id.toString(),
            name: dialog.title || dialog.name || 'Unknown',
            username: dialog.entity?.username || null,
            type: dialog.isChannel ? 'channel' : dialog.isGroup ? 'group' : 'user',
            accessHash: dialog.entity?.accessHash?.toString() || null
        }));
    } catch (err) {
        console.error('Failed to fetch dialogs:', err.message);
        return [];
    }
};

/**
 * Fetch and update engagement metrics for a task using MTProto user client
 */
const updateMetrics = async (taskId) => {
    try {
        const task = await Task.findOne({ taskId });
        if (!task || !task.sentMessages.length) return { success: false, error: "Task or messages not found" };

        if (!task.createdBy) {
            throw new Error('Task is missing createdBy; cannot fetch metrics');
        }

        // Prepare batch payload
        const payload = task.sentMessages.map(msg => ({
            recipientId: msg.recipientId,
            messageId: msg.messageId
        }));

        console.log(`📊 Fetching batch analytics for ${payload.length} messages from Python Service...`);

        let batchData = {};
        try {
            const response = await fetch(`${process.env.PYTHON_SERVICE_URL}/analytics/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': task.createdBy.toString() },
                body: JSON.stringify(payload)
            });
            batchData = await response.json();
        } catch (err) {
            console.error('❌ Failed to fetch analytics from Python:', err.message);
            throw err;
        }

        let updatedCount = 0;
        for (const msg of task.sentMessages) {
            const metrics = batchData[msg.messageId.toString()];

            if (metrics) {
                msg.metrics.views = metrics.views;
                msg.metrics.forwards = metrics.forwards;
                msg.metrics.replies = metrics.replies;
                msg.metrics.reactions = metrics.reactions;
                msg.metrics.voters = metrics.voters;
                msg.metrics.updatedAt = new Date();
                updatedCount++;
            }
        }

        if (updatedCount > 0) {
            console.log(`💾 Saving ${updatedCount} metric updates to database...`);
            task.markModified('sentMessages'); // Explicitly mark array as modified
            await task.save();
            console.log('✅ Database save completed');
        }

        return { success: true, updatedCount };
    } catch (err) {
        console.error('Metrics update failed:', err);
        throw err;
    }
};

module.exports = {
    getClient,
    sendCode,
    signIn,
    getStatus,
    sendBroadcast,
    fetchDialogs,
    deleteMessages,
    updateMetrics
};
