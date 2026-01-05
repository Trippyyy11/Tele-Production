import { useQuery } from '@tanstack/react-query'
import { getTasks, getFolders } from '../services/api'
import { Zap, Users, Send, CheckCircle2, Clock, ArrowUpRight, TrendingUp, Calendar, Timer } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'

function Dashboard() {
    const { user } = useAuth()
    const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: getTasks })
    const { data: folders = [] } = useQuery({ queryKey: ['folders'], queryFn: getFolders })

    const completedTasks = tasks.filter(t => t.status === 'completed').length
    const totalRecipients = tasks.reduce((sum, t) => sum + (t.recipientCount || 0), 0)

    // Scheduled Stats
    const scheduledPending = tasks.filter(t => t.status === 'pending' && new Date(t.scheduledAt) > new Date()).length
    const scheduledSent = tasks.filter(t => t.status === 'completed' && t.scheduledAt).length
    const activeExpiryTasks = tasks.map(t => {
        if (t.status === 'completed' && t.expiryHours > 0 && t.completedAt) {
            const expiresAt = new Date(new Date(t.completedAt).getTime() + t.expiryHours * 60 * 60 * 1000)
            return { ...t, expiresAt }
        }
        return null
    }).filter(t => t && t.expiresAt > new Date())

    const expiredCount = tasks.filter(t => t.status === 'expired').length

    return (
        <div className="space-y-4 animate-in">
            {/* Hero Section */}
            <header className="relative py-12 px-8 rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 overflow-hidden shadow-xl shadow-primary-500/20">
                <div className="relative z-10 max-w-2xl">
                    <h1 className="text-4xl font-extrabold text-white mb-3">
                        Welcome to Teaching Pariksha Exclusive Telegram Broadcasting Service
                    </h1>
                    <p className="text-primary-100/90 text-lg font-medium">
                        Your command center for high-performance Telegram broadcasting.
                    </p>
                </div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-500/30 blur-[60px] rounded-full -translate-x-1/4 translate-y-1/4" />
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<Users className="w-6 h-6" />}
                    label="Total Folders"
                    value={folders.length}
                    color="text-blue-500 bg-blue-50"
                />
                <StatCard
                    icon={<Send className="w-6 h-6" />}
                    label="Broadcasts Sent"
                    value={completedTasks}
                    color="text-green-500 bg-green-50"
                />
                <StatCard
                    icon={<CheckCircle2 className="w-6 h-6" />}
                    label="Recipients Reached"
                    value={totalRecipients.toLocaleString()}
                    color="text-purple-500 bg-purple-50"
                />
                <StatCard
                    icon={<Clock className="w-6 h-6" />}
                    label="Pending Tasks"
                    value={tasks.filter(t => t.status === 'pending').length}
                    color="text-amber-500 bg-amber-50"
                />
            </div>

            {/* Scheduled & Expiry Tasks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <TaskFlashCard
                    icon={<Calendar className="w-6 h-6" />}
                    label="Scheduled Tasks"
                    value={scheduledPending}
                    subValue={`${scheduledSent} Sent`}
                    color="text-blue-500 bg-blue-50"
                    tasks={tasks.filter(t => t.status === 'pending' && new Date(t.scheduledAt) > new Date()).slice(0, 3)}
                />
                <TaskFlashCard
                    icon={<Timer className="w-6 h-6" />}
                    label="Active Expiry Tasks"
                    value={activeExpiryTasks.length}
                    subValue={`${expiredCount} Expired`}
                    color="text-red-500 bg-red-50"
                    tasks={activeExpiryTasks.sort((a, b) => a.expiresAt - b.expiresAt).slice(0, 3)}
                />
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className={`${['admin', 'moderator'].includes(user?.role) ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-3xl p-4 card-shadow border border-gray-100`}>
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-900">
                        <Zap className="w-5 h-5 text-primary-500" />
                        Recent Broadcasts
                    </h2>
                    {tasks.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <p className="text-gray-500">No broadcasts yet. Start by creating a folder!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tasks.slice(0, 5).map((task) => (
                                <div
                                    key={task.taskId}
                                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-white hover:card-shadow border border-gray-100 transition-all duration-200"
                                >
                                    <div>
                                        <p className="font-bold text-gray-900">{task.name}</p>
                                        <p className="text-sm text-gray-500">{task.recipientCount} recipients</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${task.status === 'completed' ? 'bg-green-50 text-green-600 border-green-100' :
                                        task.status === 'processing' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                            task.status === 'failed' ? 'bg-red-50 text-red-600 border-red-100' :
                                                'bg-amber-50 text-amber-600 border-amber-100'
                                        }`}>
                                        {task.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                {['admin', 'moderator'].includes(user?.role) && (
                    <div className="bg-white rounded-3xl p-4 card-shadow border border-gray-100 h-fit">
                        <h2 className="text-xl font-bold mb-6 text-gray-900">Quick Actions</h2>
                        <div className="space-y-3">
                            <QuickAction href="/folders" label="Create Folder" />
                            <QuickAction href="/send" label="Send Broadcast" />
                            <QuickAction href="/quiz" label="Create Quiz" />
                            <QuickAction href="/history" label="View History" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function StatCard({ icon, label, value, color }) {
    return (
        <div className="bg-white rounded-2xl p-4 card-shadow border border-gray-100 transition-transform hover:-translate-y-1 duration-300">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                {icon}
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
            <p className="text-3xl font-extrabold text-gray-900">{value}</p>
        </div>
    )
}

function TaskFlashCard({ icon, label, value, subValue, color, tasks }) {
    return (
        <div className="bg-white rounded-2xl p-4 card-shadow border border-gray-100 transition-transform hover:-translate-y-1 duration-300">
            <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                    {icon}
                </div>
                <div className="text-right">
                    <p className="text-2xl font-extrabold text-gray-900">{value}</p>
                    <p className="text-sm font-medium text-gray-500">{label}</p>
                    {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
                </div>
            </div>
            <div className="space-y-2">
                {tasks.map((task) => (
                    <div key={task.taskId} className="text-xs bg-gray-50 rounded-lg p-2">
                        <p className="font-medium text-gray-700 truncate">{task.name}</p>
                        <p className="text-gray-500">
                            {task.scheduledAt ? `Scheduled: ${new Date(task.scheduledAt).toLocaleDateString()}` : `Expires: ${new Date(task.expiresAt).toLocaleDateString()}`}
                        </p>
                    </div>
                ))}
                {tasks.length === 0 && (
                    <p className="text-xs text-gray-400 italic">None</p>
                )}
            </div>
        </div>
    )
}

function QuickAction({ href, label }) {
    return (
        <a
            href={href}
            className="flex items-center justify-between p-4 rounded-xl bg-gray-50 text-gray-700 hover:bg-primary-50 hover:text-primary-600 font-medium transition-all group border border-gray-100 hover:border-primary-100"
        >
            <span>{label}</span>
            <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
        </a>
    )
}

export default Dashboard
