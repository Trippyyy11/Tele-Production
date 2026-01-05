import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getTasks, undoTask, clearHistory, retryTask } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { History as HistoryIcon, Clock, CheckCircle2, AlertCircle, Loader2, Search, RotateCcw, User, Calendar, Filter, Trash2, RefreshCw } from 'lucide-react'
import { useState } from 'react'

function History() {
    const { user } = useAuth()
    const [search, setSearch] = useState('')
    const [filterUser, setFilterUser] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [dateRangePreset, setDateRangePreset] = useState('all') // 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom'
    const [filterDateFrom, setFilterDateFrom] = useState('')
    const [filterDateTo, setFilterDateTo] = useState('')
    const queryClient = useQueryClient()

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['tasks'],
        queryFn: getTasks
    })

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.name.toLowerCase().includes(search.toLowerCase())
        const matchesUser = !filterUser || task.createdByUsername === filterUser
        const matchesStatus = !filterStatus || task.status === filterStatus

        const taskDate = new Date(task.scheduledAt || task.createdAt)
        const now = new Date()
        now.setHours(0, 0, 0, 0)

        let matchesDate = true
        if (dateRangePreset === 'today') {
            matchesDate = taskDate >= now
        } else if (dateRangePreset === 'yesterday') {
            const yesterday = new Date(now)
            yesterday.setDate(now.getDate() - 1)
            matchesDate = taskDate >= yesterday && taskDate < now
        } else if (dateRangePreset === '7days') {
            const sevenDaysAgo = new Date(now)
            sevenDaysAgo.setDate(now.getDate() - 7)
            matchesDate = taskDate >= sevenDaysAgo
        } else if (dateRangePreset === '30days') {
            const thirtyDaysAgo = new Date(now)
            thirtyDaysAgo.setDate(now.getDate() - 30)
            matchesDate = taskDate >= thirtyDaysAgo
        } else if (dateRangePreset === 'custom') {
            const matchesDateFrom = !filterDateFrom || taskDate >= new Date(filterDateFrom)
            const matchesDateTo = !filterDateTo || taskDate <= new Date(filterDateTo + 'T23:59:59')
            matchesDate = matchesDateFrom && matchesDateTo
        }

        return matchesSearch && matchesUser && matchesStatus && matchesDate
    })

    // [FIX] Split multi-message tasks into separate rows for history display
    const displayTasks = filteredTasks.flatMap(task => {
        if (task.type === 'multi_message' && task.content?.messages?.length > 0) {
            return task.content.messages.map((msg, index) => ({
                ...task,
                // Create a virtual unique ID for React key
                uniqueKey: `${task.taskId}-part-${index}`,
                // Append (Part X) to name
                name: `${task.name} (Part ${index + 1})`,
                // Override content to show just this message's text/media
                content: {
                    ...task.content,
                    text: msg.text,
                    mediaUrl: msg.mediaUrl || (msg.mediaUrls ? msg.mediaUrls[0] : null)
                },
                // Keep references to parent for actions
                parentTaskId: task.taskId,
                isVirtualPart: true
            }));
        }
        return [{ ...task, uniqueKey: task.taskId }];
    });

    const handleUndo = async (taskId) => {
        console.log('🔄 Triggering UNDO for task:', taskId)
        try {
            const res = await undoTask(taskId)
            console.log('✅ Undo response:', res)
            alert('Undo request sent successfully.')
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
        } catch (err) {
            console.error('❌ Undo failed:', err)
            alert('Failed to undo broadcast: ' + (err.response?.data?.error || err.message))
        }
    }

    const handleRetry = async (taskId) => {
        console.log('🔁 Triggering RETRY for task:', taskId)
        if (!confirm('Are you sure you want to retry this failed broadcast?')) return
        try {
            const res = await retryTask(taskId)
            console.log('✅ Retry response:', res)
            alert('Retry request sent successfully.')
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
        } catch (err) {
            console.error('❌ Retry failed:', err)
            alert('Failed to retry broadcast: ' + (err.response?.data?.error || err.message))
        }
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-500" />
            case 'processing': return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            case 'failed': return <AlertCircle className="w-5 h-5 text-red-500" />
            case 'partially_completed': return <CheckCircle2 className="w-5 h-5 text-amber-500" />
            case 'undone': return <RotateCcw className="w-5 h-5 text-violet-500" />
            default: return <Clock className="w-5 h-5 text-amber-500" />
        }
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-50 text-green-700 border border-green-200'
            case 'processing': return 'bg-blue-50 text-blue-700 border border-blue-200'
            case 'failed': return 'bg-red-50 text-red-700 border border-red-200'
            case 'partially_completed': return 'bg-amber-50 text-amber-700 border border-amber-200'
            case 'undone': return 'bg-violet-50 text-violet-700 border border-violet-200'
            default: return 'bg-amber-50 text-amber-700 border border-amber-200'
        }
    }

    const uniqueUsers = [...new Set(tasks.map(t => t.createdByUsername).filter(Boolean))]

    const handleClearHistory = async () => {
        if (!confirm('Are you sure you want to clear ALL history? This cannot be undone.')) return
        try {
            await clearHistory()
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            alert('History cleared successfully')
        } catch (err) {
            alert('Failed to clear history: ' + (err.response?.data?.error || err.message))
        }
    }

    return (
        <div className="space-y-4 animate-in">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold mb-2 text-gray-900">Broadcast History</h1>
                    <p className="text-gray-500">Review and manage your previous broadcasts.</p>
                </div>

                <div className="flex gap-3">
                    <div className="flex gap-3">
                        {/* Clear History button removed as per request */}
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-2 rounded-xl bg-white border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none w-64 shadow-sm transition-all text-gray-900 placeholder:text-gray-400"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={filterUser}
                            onChange={(e) => setFilterUser(e.target.value)}
                            className="px-3 py-2 rounded-xl bg-white border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none text-sm"
                        >
                            <option value="">All Users</option>
                            {uniqueUsers.map(u => (
                                <option key={u} value={u}>{u}</option>
                            ))}
                        </select>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-3 py-2 rounded-xl bg-white border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none text-sm"
                        >
                            <option value="">Status</option>
                            <option value="completed">Completed</option>
                            <option value="partially completed">Partially Completed</option>
                            <option value="processing">Processing</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                            <option value="undone">Undone</option>
                            <option value="expired">Expired</option>
                        </select>
                        <select
                            value={dateRangePreset}
                            onChange={(e) => setDateRangePreset(e.target.value)}
                            className="px-3 py-2 rounded-xl bg-white border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none text-sm"
                        >
                            <option value="all">Date Range</option>
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="7days">Last 7 Days</option>
                            <option value="30days">Last 30 Days</option>
                            <option value="custom">Custom Range</option>
                        </select>
                        {dateRangePreset === 'custom' && (
                            <>
                                <input
                                    type="date"
                                    value={filterDateFrom}
                                    onChange={(e) => setFilterDateFrom(e.target.value)}
                                    className="px-3 py-2 rounded-xl bg-white border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none text-sm"
                                />
                                <input
                                    type="date"
                                    value={filterDateTo}
                                    onChange={(e) => setFilterDateTo(e.target.value)}
                                    className="px-3 py-2 rounded-xl bg-white border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none text-sm"
                                />
                            </>
                        )}
                    </div>
                </div>
            </header>

            <div className="bg-white rounded-2xl overflow-hidden card-shadow border border-gray-100">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Task</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Recipients</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Scheduled Time</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Sent By</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan="7" className="py-12 text-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
                                </td>
                            </tr>
                        ) : displayTasks.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="py-12 text-center text-gray-500">
                                    {search || filterUser || filterDateFrom || filterDateTo ? 'No tasks match your filters.' : 'No broadcast history yet.'}
                                </td>
                            </tr>
                        ) : (
                            displayTasks.map((task) => (
                                <tr key={task.uniqueKey} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div>
                                            <p className="font-bold text-gray-900">{task.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-xs text-gray-500 truncate max-w-[200px]">
                                                    {task.content?.text || task.content?.pollQuestion || "No content"}
                                                </p>
                                                {task.content?.mediaUrl && (
                                                    <span className="px-1.5 py-0.5 rounded bg-primary-50 text-primary-600 text-[10px] font-bold border border-primary-100">
                                                        MEDIA
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-bold capitalize border border-gray-200">
                                            {task.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-bold text-gray-900">{task.recipientCount}</td>
                                    <td className="px-4 py-3 text-gray-500 text-sm">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-700">
                                                {new Date(task.scheduledAt || task.createdAt).toLocaleDateString()}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {new Date(task.scheduledAt || task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm font-medium text-gray-700">{task.createdByUsername || '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(task.status)}`}>
                                            {getStatusIcon(task.status)}
                                            {task.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {task.status === 'failed' && task.createdByUsername === user?.username && (
                                            <button
                                                onClick={() => handleRetry(task.taskId)}
                                                className="p-2 rounded-lg bg-gray-100 hover:bg-blue-50 text-gray-500 hover:text-blue-500 transition-all group border border-gray-200 hover:border-blue-200"
                                                title="Retry failed broadcast"
                                            >
                                                <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform" />
                                            </button>
                                        )}
                                        {(task.status === 'completed' || task.status === 'partially_completed') && (
                                            <button
                                                onClick={() => handleUndo(task.taskId)}
                                                className="p-2 rounded-lg bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 transition-all group border border-gray-200 hover:border-red-200"
                                                title="Undo / Delete sent messages"
                                            >
                                                <RotateCcw className="w-4 h-4 group-hover:rotate-[-90deg] transition-transform" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default History
