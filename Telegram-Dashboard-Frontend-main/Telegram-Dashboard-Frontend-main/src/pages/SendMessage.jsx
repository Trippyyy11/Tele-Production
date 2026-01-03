import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getFolders, scheduleTask, getEntities } from '../services/api'
import { Send, Calendar, Clock, CheckCircle2, AlertCircle, Loader2, FolderKanban, Info, Layers, ArrowRight, Eye } from 'lucide-react'
import TimePicker from '../components/TimePicker'
import { MessageList } from '../components/MessageList'
import { FolderTreeSelector } from '../components/FolderTreeSelector'
import { ChannelPriorityList } from '../components/ChannelPriorityList'
import { DeliveryStrategy } from '../components/DeliveryStrategy'
import TelegramPreview from '../components/TelegramPreview'

function SendMessage() {
    // --- State ---
    const [taskName, setTaskName] = useState('')

    // Messages State
    const [messages, setMessages] = useState([
        { id: 'msg-1', content: '', media: null }
    ])

    // Target Selection State
    const [selectedEntityIds, setSelectedEntityIds] = useState([])

    // Scheduling & Priority State
    const [schedulingMode, setSchedulingMode] = useState('immediate') // 'immediate' | 'delay' | 'schedule'
    const [delayMinutes, setDelayMinutes] = useState(1) // Delay between channels
    const [scheduleDate, setScheduleDate] = useState('')
    const [scheduleTime, setScheduleTime] = useState('12:00 PM')
    const [expiryHours, setExpiryHours] = useState('')

    // Ordered Channels for Priority
    const [orderedChannels, setOrderedChannels] = useState([])

    // Feedback State
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState(null)
    const [showPreview, setShowPreview] = useState(true)

    // --- Data Fetching ---
    const { data: folders = [] } = useQuery({
        queryKey: ['folders'],
        queryFn: getFolders
    })

    const { data: entities = [] } = useQuery({
        queryKey: ['entities'],
        queryFn: getEntities
    })

    // --- Computed ---
    // Create a robust map of all entities (from folders + direct entity fetch)
    const allEntitiesMap = useMemo(() => {
        const map = new Map();

        // 1. From direct entity fetch (Best source)
        if (entities.length) {
            entities.forEach(e => map.set(e.telegramId || e._id, e));
        }

        // 2. Fallback: From folders (if entities array incomplete)
        folders.forEach(folder => {
            if (folder.entityIds) {
                folder.entityIds.forEach(entity => {
                    const id = typeof entity === 'object' ? entity._id : entity;
                    if (!map.has(id) && typeof entity === 'object') {
                        map.set(id, entity);
                    }
                });
            }
        });
        return map;
    }, [folders, entities]);

    // Sync orderedChannels when selection changes
    useEffect(() => {
        setOrderedChannels(prev => {
            const currentIds = new Set(prev.map(c => c.id));
            const newOrdered = [...prev.filter(c => selectedEntityIds.includes(c.id))];

            selectedEntityIds.forEach(id => {
                if (!currentIds.has(id)) {
                    const entity = allEntitiesMap.get(id);
                    // Try to find entity by ID or TelegramID
                    // In FolderTreeSelector we use ID, so map needs to be keyed by ID mainly.
                    // But backend sends Entities with _id, telegramId.

                    if (entity) {
                        newOrdered.push({
                            id: entity._id || entity.telegramId || id, // Fallback
                            name: entity.name || entity.username || 'Unknown Channel',
                            type: entity.type
                        });
                    } else {
                        // Fallback purely on ID if map fails
                        newOrdered.push({
                            id: id,
                            name: 'Unknown Channel', // Placeholder until fetched
                            type: 'channel'
                        });
                    }
                }
            });
            return newOrdered;
        });
    }, [selectedEntityIds, allEntitiesMap]);


    // --- Mutations ---
    const scheduleMutation = useMutation({
        mutationFn: scheduleTask,
        onSuccess: () => {
            setSuccess(true)
            setError(null)
            setTimeout(() => setSuccess(false), 5000)
        },
        onError: (err) => {
            setError(err.response?.data?.error || err.message)
            setTimeout(() => setError(null), 8000)
        }
    })

    // --- Handlers ---
    const handleSubmit = (e) => {
        e.preventDefault()
        console.log('🚀 SUBMITTING CAMPAIGN:', { taskName, messagesCount: messages.length, selectedCount: selectedEntityIds.length })

        if (!taskName.trim()) { alert('Please enter a campaign name'); return; }
        if (messages.length === 0) { alert('Please add at least one message'); return; }
        if (selectedEntityIds.length === 0) { alert('Please select at least one target channel/group'); return; }

        const formData = new FormData()
        formData.append('name', taskName.trim())
        formData.append('type', messages.length > 1 ? 'multi_message' : 'message')

        // Content
        const messagePayload = messages.map(m => ({
            id: m.id,
            text: m.content
        }));

        formData.append('content', JSON.stringify({
            messages: messagePayload,
            isMulti: messages.length > 1
        }))

        // Targets
        let targetIds = selectedEntityIds;
        if (schedulingMode === 'delay') {
            targetIds = orderedChannels.map(c => c.id);
        }
        formData.append('targetIds', JSON.stringify(targetIds));

        // Scheduling Config
        const schedulingConfig = {
            mode: schedulingMode,
            delayMinutes: schedulingMode === 'delay' ? delayMinutes : 0,
        };

        if (schedulingMode === 'schedule' && scheduleDate && scheduleTime) {
            const [time, period] = scheduleTime.split(' ')
            const [hourStr, minuteStr] = time.split(':')
            let hour = parseInt(hourStr)
            const minute = parseInt(minuteStr)
            if (period === 'PM' && hour !== 12) hour += 12
            if (period === 'AM' && hour === 12) hour = 0
            const dt = new Date(scheduleDate)
            dt.setHours(hour, minute, 0, 0)
            formData.append('scheduledAt', dt.toISOString())
        }

        formData.append('scheduling', JSON.stringify(schedulingConfig));

        if (expiryHours) formData.append('expiryHours', expiryHours)

        // Append Media Files (Handle Arrays)
        messages.forEach(msg => {
            if (msg.media) {
                if (Array.isArray(msg.media)) {
                    msg.media.forEach((mItem, idx) => {
                        // We can append multiple files with same key 'media_<id>'
                        // Backend configured to handle this as array
                        formData.append(`media_${msg.id}`, mItem.file);
                    });
                } else if (msg.media instanceof File) {
                    // Legacy single file
                    formData.append(`media_${msg.id}`, msg.media)
                }
            }
        });

        scheduleMutation.mutate(formData)
    }

    return (
        <div className="space-y-8 animate-in pb-20">
            <header>
                <h1 className="text-3xl font-extrabold mb-2 text-gray-900">Send Broadcast</h1>
                <p className="text-gray-500">Create multi-message campaigns with advanced scheduling.</p>
            </header>

            {success && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 text-green-600 border border-green-200 shadow-sm sticky top-4 z-10">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">Campaign scheduled successfully!</span>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 text-red-600 border border-red-200 shadow-sm sticky top-4 z-10">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                {/* Left Column: Content Editor (7 cols) */}
                <div className="xl:col-span-7 space-y-6">
                    {/* Editor */}
                    <div className="bg-white rounded-2xl p-6 card-shadow border border-gray-100 space-y-6">
                        <div className="flex items-center justify-center gap-2 pb-4 border-b border-gray-100">
                            <Send className="w-5 h-5 text-primary-500" />
                            <h2 className="text-lg font-bold text-gray-900">Campaign Content</h2>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Campaign Name</label>
                            <input
                                type="text"
                                placeholder="e.g., Q1 Marketing Blast"
                                value={taskName}
                                onChange={(e) => setTaskName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-transparent border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none transition-all"
                            />
                        </div>

                        {/* Drag and Drop Message List */}
                        <MessageList messages={messages} setMessages={setMessages} />
                    </div>
                </div>

                {/* Right Column: Preview, Targeting & Scheduling (5 cols) */}
                <div className="xl:col-span-5 space-y-6">

                    {/* 1. Live Preview - Moved here */}
                    <div className="bg-gray-100 rounded-2xl overflow-hidden card-shadow border border-gray-200 transition-all duration-300">
                        <div className="p-3 bg-white border-b border-gray-200 flex items-center justify-between cursor-pointer" onClick={() => setShowPreview(!showPreview)}>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Live Preview</span>
                                <Eye className={`w-4 h-4 text-gray-400 ${showPreview ? 'text-primary-500' : ''}`} />
                            </div>
                            <button type="button" className="text-xs text-gray-400 hover:text-gray-600 font-medium">
                                {showPreview ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        {showPreview && (
                            <div className="p-4 flex justify-center bg-gray-50 overflow-hidden animate-in slide-in-from-top-2">
                                <TelegramPreview content={messages} className="w-full" />
                            </div>
                        )}
                    </div>

                    {/* 2. Targeting Strategies */}
                    <div className="bg-white rounded-2xl p-6 card-shadow border border-gray-100 space-y-4">
                        <div className="flex items-center justify-center gap-2 pb-4 border-b border-gray-100">
                            <FolderKanban className="w-5 h-5 text-primary-500" />
                            <h2 className="text-lg font-bold text-gray-900">Target Audience</h2>
                        </div>

                        <FolderTreeSelector
                            folders={folders}
                            selectedConfig={selectedEntityIds}
                            onSelectionChange={setSelectedEntityIds}
                            entitiesMap={allEntitiesMap} // Pass map for names
                        />

                        <div className="text-sm text-gray-500 text-right px-2">
                            Selected: <span className="font-bold text-primary-600">{selectedEntityIds.length}</span> channels
                        </div>
                    </div>

                    {/* 3. Scheduling Logic */}
                    <DeliveryStrategy
                        schedulingMode={schedulingMode}
                        setSchedulingMode={setSchedulingMode}
                        delayMinutes={delayMinutes}
                        setDelayMinutes={setDelayMinutes}
                        scheduleDate={scheduleDate}
                        setScheduleDate={setScheduleDate}
                        scheduleTime={scheduleTime}
                        setScheduleTime={setScheduleTime}
                        expiryHours={expiryHours}
                        setExpiryHours={setExpiryHours}
                        orderedChannels={orderedChannels}
                        setOrderedChannels={setOrderedChannels}
                    />

                    <button
                        type="submit"
                        disabled={scheduleMutation.isPending}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg shadow-xl shadow-primary-500/30 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98]"
                    >
                        {scheduleMutation.isPending ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                Launch Campaign
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default SendMessage
