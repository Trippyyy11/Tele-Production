import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getFolders, scheduleTask, getEntities } from '../services/api'
import { HelpCircle, Wand2, Plus, Trash2, CheckCircle2, Loader2, Upload, Calendar, Eye, FolderKanban, AlertCircle } from 'lucide-react'
import { wordFileParser } from '../utils/wordFileParser'
import mammoth from 'mammoth'
import { FolderTreeSelector } from '../components/FolderTreeSelector'
import TelegramPreview from '../components/TelegramPreview'
import { SortableQuizList } from '../components/SortableQuizList'
import { DeliveryStrategy } from '../components/DeliveryStrategy'

function QuizBuilder() {
    const [mode, setMode] = useState('auto')
    const [showPreview, setShowPreview] = useState(false)

    // Tasks List State
    const [quizzes, setQuizzes] = useState([])

    // Delivery Strategy State
    const [schedulingMode, setSchedulingMode] = useState('immediate') // 'immediate' | 'delay' | 'schedule'
    const [delayMinutes, setDelayMinutes] = useState(1)
    const [scheduleDate, setScheduleDate] = useState('')
    const [scheduleTime, setScheduleTime] = useState('12:00 PM')
    const [expiryHours, setExpiryHours] = useState('')

    // Ordered Channels for Priority (DeliveryStrategy requirement)
    const [orderedChannels, setOrderedChannels] = useState([])

    // Form Inputs
    const [taskName, setTaskName] = useState('')

    // Target Selection State
    const [selectedEntityIds, setSelectedEntityIds] = useState([])

    const [rawText, setRawText] = useState('')
    const [success, setSuccess] = useState(false)
    const [isParsing, setIsParsing] = useState(false)
    const [error, setError] = useState(null)

    const { data: folders = [] } = useQuery({
        queryKey: ['folders'],
        queryFn: getFolders
    })

    const { data: entities = [] } = useQuery({
        queryKey: ['entities'],
        queryFn: getEntities
    })

    const allEntitiesMap = useMemo(() => {
        const map = new Map();
        if (entities.length) {
            entities.forEach(e => map.set(e.telegramId || e._id, e));
        }
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

    // Sync orderedChannels when selection changes (DeliveryStrategy)
    useEffect(() => {
        setOrderedChannels(prev => {
            const currentIds = new Set(prev.map(c => c.id));
            const newOrdered = [...prev.filter(c => selectedEntityIds.includes(c.id))];

            selectedEntityIds.forEach(id => {
                if (!currentIds.has(id)) {
                    const entity = allEntitiesMap.get(id);
                    if (entity) {
                        newOrdered.push({
                            id: entity._id || entity.telegramId || id,
                            name: entity.name || entity.username || 'Unknown Channel',
                            type: entity.type
                        });
                    } else {
                        newOrdered.push({
                            id: id,
                            name: 'Unknown Channel',
                            type: 'channel'
                        });
                    }
                }
            });
            return newOrdered;
        });
    }, [selectedEntityIds, allEntitiesMap]);

    const scheduleMutation = useMutation({
        mutationFn: async (quizData) => {
            // We return the promise to allow Promise.all
            return scheduleTask(quizData)
        }
    })

    const handleFileUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        const fileName = file.name.toLowerCase()

        // Check if it's a Word document
        if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
            try {
                console.log('📄 Reading Word document...')
                const arrayBuffer = await file.arrayBuffer()
                const result = await mammoth.extractRawText({ arrayBuffer })
                setRawText(result.value)
                console.log('✅ Word document loaded successfully')
                if (result.messages.length > 0) {
                    console.warn('⚠️ Mammoth warnings:', result.messages)
                }
            } catch (error) {
                console.error('❌ Error reading Word document:', error)
                alert('Failed to read Word document. Please try a .txt file or copy-paste the content.')
            }
        } else {
            // Handle text files (.txt, .csv, .md)
            const reader = new FileReader()
            reader.onload = (event) => setRawText(event.target.result)
            reader.readAsText(file)
        }
    }

    const parseRawText = () => {
        if (!rawText.trim()) return
        setIsParsing(true)

        try {
            // Try custom word file parser first
            const parsedQuizzes = wordFileParser(rawText)

            if (parsedQuizzes.length > 0) {
                // Extract scheduled time from first quiz if available (for backward compatibility)
                const firstQuiz = parsedQuizzes[0]
                if (firstQuiz.scheduledAt) {
                    setScheduledTime(new Date(firstQuiz.scheduledAt))
                }

                // Set quizzes - PRESERVE scheduledAt for individual scheduling
                setQuizzes(parsedQuizzes.map((q, i) => ({
                    id: `quiz-${Date.now()}-${i}`, // Unique ID for DnD
                    question: q.question,
                    options: q.options,
                    correctOption: q.correctOption,
                    explanation: q.explanation,
                    scheduledAt: q.scheduledAt // Preserve individual scheduled time
                })))

                setMode('preview')
                console.log(`✅ Parsed ${parsedQuizzes.length} quizzes using custom format`)
            } else {
                // Fallback to generic parser
                console.log('⚠️ Custom parser found no quizzes, trying generic parser...')
                parseWithGenericParser()
            }
        } catch (error) {
            console.error('❌ Custom parser error:', error)
            // Fallback to generic parser
            parseWithGenericParser()
        }

        setIsParsing(false)
    }

    // Generic fallback parser (original logic)
    const parseWithGenericParser = () => {
        // 1. Detect Scheduling
        const scheduleRegex = /scheduled on (\d{1,2}\/\d{1,2}\/\d{4}) at (\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i
        const scheduleMatch = rawText.match(scheduleRegex)
        let foundSchedule = null
        if (scheduleMatch) {
            const [_, dateStr, timeStr] = scheduleMatch
            const [day, month, year] = dateStr.split('/')
            const timeParts = timeStr.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i)
            if (timeParts) {
                let hour = parseInt(timeParts[1])
                const minute = parseInt(timeParts[2] || '0')
                const period = timeParts[3].toUpperCase()
                if (period === 'PM' && hour < 12) hour += 12
                if (period === 'AM' && hour === 12) hour = 0
                foundSchedule = new Date(year, month - 1, day, hour, minute)
                setScheduledTime(foundSchedule)
            }
        }

        // 2. Split by "Question" or number patterns to find multiple blocks
        const blocks = rawText.split(/\n\s*\n/)
        const newQuizzes = []

        // Helper to parse a single block
        const parseBlock = (block) => {
            if (!block.trim()) return null
            const lines = block.split('\n').filter(l => l.trim())
            let q = '', opts = [], corr = -1, exp = ''
            let dateStr = null, timeStr = null

            for (const line of lines) {
                const trimmed = line.trim()
                if (scheduleRegex.test(trimmed)) continue

                // Explicit Date/Time lines
                const dateMatch = trimmed.match(/^Date\s*:\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i)
                if (dateMatch) { dateStr = dateMatch[1].replace(/-/g, '/'); continue; }
                const timeMatch = trimmed.match(/^Time\s*:\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i)
                if (timeMatch) { timeStr = timeMatch[1].toUpperCase(); continue; }

                // Question
                if (trimmed.match(/^(Question:|Que:|Q:|\d+\.)/i) && !q) {
                    q = trimmed.replace(/^(Question:|Que:|Q:|\d+\.)\s*/i, '').trim()
                    continue
                } else if (!q && opts.length === 0) {
                    q = trimmed
                    continue
                }

                // Answer
                if (trimmed.match(/^(Answer:|Ans:|Correct:)/i)) {
                    const ansText = trimmed.split(':')[1]?.trim().toUpperCase()
                    if (ansText) {
                        const charCode = ansText.charCodeAt(0)
                        if (charCode >= 65 && charCode <= 74) corr = charCode - 65
                        else if (charCode >= 49 && charCode <= 57) corr = parseInt(ansText) - 1
                    }
                    continue
                }

                // Explanation
                if (trimmed.match(/^(Explanation:|Exp:|Solution:)/i)) {
                    exp = trimmed.replace(/^(Explanation:|Exp:|Solution:)\s*/i, '').trim()
                    continue
                }

                // Option
                const optionMatch = trimmed.match(/^([A-J]\)|[A-J]\.|[1-9]\.|Option\s+\d+:?)\s*(.+)/i)
                if (optionMatch) {
                    opts.push(optionMatch[2].trim())
                } else if (opts.length > 0 && !trimmed.match(/^(Answer|Ans|Correct|Explanation|Exp|Solution)/i)) {
                    if (opts.length < 10) opts.push(trimmed)
                }
            }

            // Calculate ScheduledAt if Date/Time found
            let scheduledAt = null
            if (dateStr && timeStr) {
                try {
                    const [day, month, year] = dateStr.split('/').map(Number)
                    const timeParts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i)
                    if (timeParts) {
                        let hour = parseInt(timeParts[1])
                        const minute = parseInt(timeParts[2])
                        const period = timeParts[3] ? timeParts[3].toUpperCase() : null
                        if (period === 'PM' && hour < 12) hour += 12
                        if (period === 'AM' && hour === 12) hour = 0
                        const d = new Date(year, month - 1, day, hour, minute)
                        scheduledAt = d.toISOString()
                    }
                } catch (e) {
                    console.error("Failed to parse schedule inside block", e)
                }
            }

            if (q && opts.length >= 2) {
                return {
                    question: q,
                    options: opts,
                    correctOption: Math.max(0, corr),
                    explanation: exp,
                    scheduledAt: scheduledAt
                }
            }
            return null
        }

        // Try parsing blocks
        for (const block of blocks) {
            const quiz = parseBlock(block)
            if (quiz) newQuizzes.push(quiz)
        }

        // Fallback: if blocks didn't work, try parsing whole text
        if (newQuizzes.length === 0) {
            const quiz = parseBlock(rawText)
            if (quiz) newQuizzes.push(quiz)
        }

        if (newQuizzes.length > 0) {
            setQuizzes(newQuizzes.map((q, i) => ({ ...q, id: `quiz-${Date.now()}-${i}` })))
            setMode('preview')
            console.log(`✅ Parsed ${newQuizzes.length} quizzes using generic parser`)
        } else {
            console.log('❌ No quizzes found')
        }
    }

    const removeQuiz = (index) => {
        const newQ = [...quizzes]
        newQ.splice(index, 1)
        setQuizzes(newQ)
    }

    const handleManualAdd = () => {
        setQuizzes([...quizzes, {
            id: `quiz-${Date.now()}`, // Unique ID
            question: '',
            options: ['', ''],
            correctOption: 0,
            explanation: ''
        }])
        // setEditingIndex removed as we don't use it
    }

    const updateQuiz = (index, field, value) => {
        const updated = [...quizzes]
        updated[index] = { ...updated[index], [field]: value }
        setQuizzes(updated)
    }

    const updateOption = (qIndex, oIndex, value) => {
        const updated = [...quizzes]
        const newOpts = [...updated[qIndex].options]
        newOpts[oIndex] = value
        updated[qIndex].options = newOpts
        setQuizzes(updated)
    }

    const addOption = (qIndex) => {
        const updated = [...quizzes]
        if (updated[qIndex].options.length >= 10) return
        updated[qIndex].options = [...updated[qIndex].options, '']
        setQuizzes(updated)
    }

    const removeOption = (qIndex, oIndex) => {
        const updated = [...quizzes]
        if (updated[qIndex].options.length <= 2) return

        const newOpts = updated[qIndex].options.filter((_, i) => i !== oIndex)
        updated[qIndex].options = newOpts

        // Correct the correctOption index if it was the one removed or is now out of bounds
        if (updated[qIndex].correctOption === oIndex) {
            updated[qIndex].correctOption = 0
        } else if (updated[qIndex].correctOption > oIndex) {
            updated[qIndex].correctOption -= 1
        }

        setQuizzes(updated)
    }

    const duplicateQuiz = (index) => {
        const newQuizzes = [...quizzes]
        const clone = { ...quizzes[index], id: `quiz-${Date.now()}-clone-${Math.random().toString(36).substr(2, 5)}` };
        newQuizzes.splice(index + 1, 0, clone)
        setQuizzes(newQuizzes)
    }

    // Bulk Submit
    const handleSubmit = async (e) => {
        e.preventDefault()
        console.log('DEBUG: handleSubmit called');

        if (!taskName.trim()) {
            setError('Please enter a task name prefix');
            setTimeout(() => setError(null), 8000);
            return;
        }
        if (quizzes.length === 0) {
            setError('Please add at least one quiz question');
            setTimeout(() => setError(null), 8000);
            return;
        }
        if (selectedEntityIds.length === 0) {
            setError('Please select at least one target channel/group');
            setTimeout(() => setError(null), 8000);
            return;
        }

        // Validate Limits & Content
        for (let i = 0; i < quizzes.length; i++) {
            const q = quizzes[i];

            if (!q.question.trim()) {
                setError(`Error in Question ${i + 1}: Question text cannot be empty.`);
                setTimeout(() => setError(null), 8000);
                return;
            }
            if (q.question.length > 300) {
                setError(`Error in Question ${i + 1}: Question length (${q.question.length}) exceeds 300 characters.`);
                setTimeout(() => setError(null), 8000);
                return;
            }

            if (q.explanation && q.explanation.length > 200) {
                setError(`Error in Question ${i + 1}: Explanation length (${q.explanation.length}) exceeds 200 characters.`);
                setTimeout(() => setError(null), 8000);
                return;
            }

            for (let j = 0; j < q.options.length; j++) {
                if (!q.options[j].trim()) {
                    setError(`Error in Question ${i + 1}, Option ${String.fromCharCode(65 + j)}: Option text cannot be empty.`);
                    setTimeout(() => setError(null), 8000);
                    return;
                }
                if (q.options[j].length > 100) {
                    setError(`Error in Question ${i + 1}, Option ${String.fromCharCode(65 + j)}: Length (${q.options[j].length}) exceeds 100 characters.`);
                    setTimeout(() => setError(null), 8000);
                    return;
                }
            }
        }

        try {
            // Schedule all quizzes
            const promises = quizzes.map((quiz, i) => {
                const nameSuffix = quizzes.length > 1 ? ` (Part ${i + 1})` : ''

                // Calculate ScheduledAt based on Mode
                let finalScheduledAt = null;

                // 1. Individual Quiz Schedule takes precedence if present (from Parser)
                if (quiz.scheduledAt) {
                    finalScheduledAt = quiz.scheduledAt;
                }
                // 2. Otherwise check Global Scheduling Mode
                else if (schedulingMode === 'schedule' && scheduleDate && scheduleTime) {
                    const [time, period] = scheduleTime.split(' ')
                    const [hourStr, minuteStr] = time.split(':')
                    let hour = parseInt(hourStr)
                    const minute = parseInt(minuteStr)
                    if (period === 'PM' && hour !== 12) hour += 12
                    if (period === 'AM' && hour === 12) hour = 0
                    const dt = new Date(scheduleDate)
                    dt.setHours(hour, minute, 0, 0)
                    finalScheduledAt = dt.toISOString()
                }

                // Construct Scheduling Config
                // Note: If using 'delay' mode, the backend usually expects us to calculate staggered times or use a queue with delay.
                // Current backend logic for 'delay' isn't explicitly shown here but let's pass the config.
                // If the backend handles 'delay', we pass it inside 'scheduling'.

                const schedulingConfig = {
                    mode: schedulingMode,
                    delayMinutes: schedulingMode === 'delay' ? delayMinutes : 0,
                };

                // Prepare Target IDs (Resolve Mongo IDs to TelegramChat IDs)
                // The backend/processor expects Telegram Chat IDs for sending.
                let targetIds = selectedEntityIds.map(id => {
                    const entity = allEntitiesMap.get(id);
                    return entity ? entity.telegramId : id; // Fallback to id if not found (though unlikely for valid entities)
                });

                if (schedulingMode === 'delay') {
                    // Use ordered channels for delay mode (Order is critical)
                    // Currently orderedChannels contains objects with .id which might be MongoID.
                    // We need to map those to telegramIds too.
                    targetIds = orderedChannels.map(c => {
                        // orderedChannels are built from selectedEntityIds, so we can look them up too
                        // The 'c.id' is what we stored (MongoID)
                        const entity = allEntitiesMap.get(c.id);
                        return entity ? entity.telegramId : c.id;
                    });
                }

                return scheduleMutation.mutateAsync({
                    name: taskName.trim() + nameSuffix,
                    type: 'poll',
                    content: {
                        pollQuestion: quiz.question,
                        pollOptions: quiz.options,
                        correctOption: quiz.correctOption,
                        pollExplanation: quiz.explanation
                    },
                    targetIds: targetIds,
                    scheduledAt: finalScheduledAt, // Still used for 'schedule' mode
                    scheduling: schedulingConfig,  // New config
                    expiryHours: expiryHours || null
                })
            })

            await Promise.all(promises)
            setSuccess(true)
            setTimeout(() => {
                setSuccess(false)
                setQuizzes([])
                setTaskName('')
                setRawText('')
                setMode('auto')
            }, 8000)
        } catch (err) {
            console.error(err)
        }
    }

    return (
        <div className="space-y-4 animate-in pb-12">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold mb-2 text-gray-900">Quiz Builder</h1>
                    <p className="text-gray-500">Create interactive quizzes (Bulk supported).</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setMode('manual'); if (quizzes.length === 0) handleManualAdd(); }}
                        className={`px-4 py-2 rounded-lg font-bold transition-colors ${mode === 'manual' || mode === 'preview' ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                    >
                        Editor
                    </button>
                    <button
                        onClick={() => setMode('auto')}
                        className={`px-4 py-2 rounded-lg font-bold transition-colors ${mode === 'auto' ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                    >
                        Auto Parse
                    </button>
                </div>
            </header>

            {success && (
                <div className="p-4 rounded-xl bg-green-50 text-green-700 border border-green-200 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-bold">All quizzes scheduled successfully!</span>
                </div>
            )}

            {error && (
                <div className="p-4 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-bold">{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
                <div className="xl:col-span-7 space-y-4">
                    {mode === 'auto' ? (
                        <div className="bg-white border border-gray-100 card-shadow rounded-2xl p-4 space-y-4">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900"><Wand2 className="w-5 h-5 text-blue-500" /> Auto Parser</h2>
                            <textarea
                                placeholder="Paste multiple questions here..."
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                rows={15}
                                className="w-full px-4 py-3 rounded-xl bg-transparent border border-gray-200 focus:border-primary-500 outline-none font-mono text-sm resize-none text-gray-800 placeholder:text-gray-400"
                            />
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors text-sm font-bold text-gray-700">
                                    <Upload className="w-4 h-4" /> Upload File
                                    <input type="file" onChange={handleFileUpload} className="hidden" accept=".txt,.csv,.md,.doc,.docx" />
                                </label>
                                <button
                                    onClick={parseRawText}
                                    className="flex-1 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold transition-colors"
                                >
                                    {isParsing ? 'Parsing...' : 'Parse & Preview'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <SortableQuizList
                            quizzes={quizzes}
                            setQuizzes={setQuizzes}
                            updateQuiz={updateQuiz}
                            removeQuiz={removeQuiz}
                            duplicateQuiz={duplicateQuiz}
                            updateOption={updateOption}
                            addOption={addOption}
                            removeOption={removeOption}
                            handleManualAdd={handleManualAdd}
                        />
                    )}
                </div>

                {/* Right Column: Settings, Targeting, Preview (5 cols) */}
                <div className="xl:col-span-5 space-y-4 sticky top-6">

                    {/* 1. Task Details (Moved to Top) */}
                    <div className="bg-white border border-gray-100 card-shadow rounded-2xl p-4 space-y-4">
                        <h2 className="font-bold text-gray-900 leading-none">Task Details</h2>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Task Name Prefix</label>
                            <input
                                value={taskName}
                                onChange={(e) => setTaskName(e.target.value)}
                                placeholder="e.g. History Quiz"
                                className="w-full px-4 py-2 rounded-xl bg-transparent border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                            />
                        </div>
                    </div>

                    {/* 2. Live Preview - With Toggle */}
                    <div className="sticky top-8 bg-gray-100 rounded-2xl overflow-hidden card-shadow border border-gray-200 transition-all duration-300">
                        <div className="p-3 bg-white border-b border-gray-200 flex items-center justify-between cursor-pointer" onClick={() => setShowPreview(!showPreview)}>
                            <div className="flex items-center gap-2">
                                <Eye className={`w-4 h-4 ${showPreview ? 'text-primary-500' : 'text-gray-400'}`} />
                                <h3 className="text-sm font-bold text-gray-700">Live Preview</h3>
                            </div>
                            <button type="button" className="text-xs text-gray-400 hover:text-gray-600 font-medium">
                                {showPreview ? 'Hide' : 'Show'}
                            </button>
                        </div>

                        {showPreview && (
                            <div className="h-[650px] flex flex-col animate-in slide-in-from-top-2">
                                {quizzes.length > 0 ? (
                                    <div className="flex-1 p-4 flex justify-center bg-gray-50 overflow-hidden">
                                        <TelegramPreview
                                            content={quizzes.map((q, i) => ({
                                                id: q.id || `preview-${i}`,
                                                pollQuestion: q.question,
                                                pollOptions: q.options,
                                                correctOption: q.correctOption,
                                                pollExplanation: q.explanation,
                                                type: 'poll'
                                            }))}
                                            className="w-full"
                                        />
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white/50 backdrop-blur-sm">
                                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 border border-gray-100">
                                            <Eye className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <h4 className="font-bold text-gray-900 mb-1">No Active Quiz</h4>
                                        <p className="text-sm text-gray-500">Add a quiz item to see a live preview of how it will appear in Telegram.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Replaced old Settings with DeliveryStrategy */}
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
                        showPriorityList={true}
                    />

                    <div className="bg-white border border-gray-100 card-shadow rounded-2xl p-4">
                        <div className="flex items-center justify-center gap-2 pb-4 border-b border-gray-100 mb-4">
                            <FolderKanban className="w-5 h-5 text-primary-500" />
                            <h2 className="text-lg font-bold text-gray-900">Target Audience</h2>
                        </div>

                        <FolderTreeSelector
                            folders={folders}
                            selectedConfig={selectedEntityIds}
                            onSelectionChange={setSelectedEntityIds}
                            entitiesMap={allEntitiesMap}
                        />
                        <div className="text-sm text-gray-500 text-right px-2 mt-2">
                            Selected: <span className="font-bold text-primary-600">{selectedEntityIds.length}</span> channels
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={scheduleMutation.isPending}
                        className="w-full py-4 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 text-white transition-all active:scale-95"
                    >
                        {scheduleMutation.isPending ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                Publish {quizzes.length} Questions
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default QuizBuilder
