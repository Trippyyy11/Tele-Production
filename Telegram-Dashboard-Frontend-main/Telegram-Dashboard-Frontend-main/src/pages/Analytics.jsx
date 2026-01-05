import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api, { updateTaskMetrics, getEntities } from '../services/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ComposedChart, Area } from 'recharts'
import { Download, BarChart2, Eye, Share2, MessageSquare, Loader2, Heart, RefreshCw, Send, CheckCircle2, AlertCircle, TrendingUp, Users } from 'lucide-react'

// New API functions
const getAnalytics = async () => {
    const res = await api.get('/tasks')
    return res.data
}

// Helper to parse Telegram Graph Data (AsyncTelegram/Telethon JSON format)
const parseTelegramGraph = (graphData) => {
    if (!graphData || !graphData.columns) return [];

    // columns: [ ["x", val, val...], ["y0", val, val...], ["y1", val...] ]
    const xCol = graphData.columns.find(c => c[0] === 'x');
    if (!xCol) return [];

    // We map timestamps to objects
    const data = xCol.slice(1).map((ts, index) => {
        const point = { date: new Date(ts).toLocaleDateString() }; // Telegram sends ms or s? usually ms in JSON chart data or s? Check data. Usually JS timestamp (ms)

        graphData.columns.forEach(col => {
            const key = col[0];
            if (key !== 'x') {
                // Map y0, y1... to friendly names if 'names' prop exists, else use key
                const name = graphData.names ? graphData.names[key] : key;
                point[name.toLowerCase()] = col[index + 1];
            }
        });
        return point;
    });

    return data;
};

const getGrowthMetrics = async ({ channelId }) => {
    if (!channelId) return null;
    try {
        // Now calls /channel-stats which returns { period, followers: { growth_graph, followers_graph, ... } }
        const res = await api.post('/analytics/channel-stats', { channelId });
        return res.data;
    } catch (e) {
        console.error("Stats fetch failed:", e);
        return null;
    }
}

const exportDatasheet = async () => {
    try {
        const response = await api.get('/analytics/export', { responseType: 'blob' })
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', 'broadcast-analytics.csv')
        document.body.appendChild(link)
        link.click()
        link.remove()
    } catch (error) {
        console.error('Export failed:', error)
    }
}

const CustomTooltip = ({ active, payload, label, chartView }) => {
    if (active && payload && payload.length) {
        let title = label;
        let date = '';

        if (chartView === 'tasks') {
            // uniqueKey format: Name__Date__ID
            const parts = label.split('__');
            if (parts.length >= 2) {
                title = parts[0];
                date = parts[1];
            }
        }

        return (
            <div className="bg-white p-3 border border-gray-100 rounded-xl shadow-lg min-w-[150px]">
                <p className="font-bold text-gray-900 mb-1">{title}</p>
                {date && <p className="text-xs text-gray-500 mb-2">{date}</p>}
                <div className="space-y-1">
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-4 text-sm">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                <span className="text-gray-500 capitalize">{entry.name}:</span>
                            </span>
                            <span className="font-bold text-gray-900">{entry.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

function Analytics() {
    const queryClient = useQueryClient()
    const [selectedChannel, setSelectedChannel] = useState('')
    const [dateRange, setDateRange] = useState('30days') // 'all', 'today', 'yesterday', '7days', '30days', 'custom'
    const [customDateFrom, setCustomDateFrom] = useState('')
    const [customDateTo, setCustomDateTo] = useState('')
    const [chartView, setChartView] = useState('daily') // 'daily' | 'tasks'

    // Queries
    const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({
        queryKey: ['tasks'],
        queryFn: getAnalytics
    })

    const { data: channels = [] } = useQuery({
        queryKey: ['entities', 'channel'],
        queryFn: () => getEntities('channel')
    })

    // Auto-select first channel if available
    if (channels.length > 0 && !selectedChannel) {
        setSelectedChannel(channels[0].telegramId)
    }

    const { data: statsData, isLoading: isLoadingGrowth, error: statsError } = useQuery({
        queryKey: ['growth', selectedChannel],
        queryFn: () => getGrowthMetrics({ channelId: selectedChannel }),
        enabled: !!selectedChannel
    })

    // Prepare chart data
    const followersGraphData = statsData?.followers?.followers_graph
        ? parseTelegramGraph(statsData.followers.followers_graph)
        : [];

    const growthGraphData = statsData?.followers?.growth_graph
        ? parseTelegramGraph(statsData.followers.growth_graph)
        : [];

    const refreshMutation = useMutation({
        mutationFn: updateTaskMetrics,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
        }
    })

    if (isLoadingTasks) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        )
    }

    // Filter tasks based on date range
    const filteredTasks = useMemo(() => {
        if (!tasks.length) return [];

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        return tasks.filter(t => {
            const taskDate = new Date(t.createdAt);

            if (dateRange === 'all') return true;
            if (dateRange === 'today') {
                return taskDate >= now;
            }
            if (dateRange === 'yesterday') {
                const yesterday = new Date(now);
                yesterday.setDate(now.getDate() - 1);
                return taskDate >= yesterday && taskDate < now;
            }
            if (dateRange === '7days') {
                const sevenDaysAgo = new Date(now);
                sevenDaysAgo.setDate(now.getDate() - 7);
                return taskDate >= sevenDaysAgo;
            }
            if (dateRange === '30days') {
                const thirtyDaysAgo = new Date(now);
                thirtyDaysAgo.setDate(now.getDate() - 30);
                return taskDate >= thirtyDaysAgo;
            }
            if (dateRange === 'custom') {
                if (!customDateFrom) return true;
                const from = new Date(customDateFrom);
                const to = customDateTo ? new Date(customDateTo) : new Date();
                to.setHours(23, 59, 59, 999);
                return taskDate >= from && taskDate <= to;
            }
            return true;
        });
    }, [tasks, dateRange, customDateFrom, customDateTo]);

    // Process data for charts
    const chartData = useMemo(() => {
        if (chartView === 'tasks') {
            // Per-Task View
            return filteredTasks
                .slice()
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) // Oldest first for chart
                .map(t => ({
                    name: t.name,
                    uniqueKey: `${t.name}__${new Date(t.createdAt).toLocaleDateString()}__${t.taskId}`, // Hidden unique key
                    displayDate: new Date(t.createdAt).toLocaleDateString(),
                    success: t.results?.success || 0,
                    failed: t.results?.failed || 0,
                    timestamp: new Date(t.createdAt).getTime()
                }));
        } else {
            // Daily View (Aggregated)
            const aggs = {};
            filteredTasks.forEach(t => {
                const date = new Date(t.createdAt).toLocaleDateString();
                if (!aggs[date]) {
                    aggs[date] = {
                        date,
                        uniqueKey: date, // For consistency
                        success: 0,
                        failed: 0,
                        timestamp: new Date(t.createdAt).getTime()
                    };
                }
                aggs[date].success += (t.results?.success || 0);
                aggs[date].failed += (t.results?.failed || 0);
            });
            return Object.values(aggs).sort((a, b) => a.timestamp - b.timestamp);
        }
    }, [filteredTasks, chartView]);

    // Calculate aggregate MTProto stats based on filtered tasks
    let totalViews = 0
    let totalForwards = 0
    let totalReplies = 0
    let totalReactions = 0

    filteredTasks.forEach(task => {
        task.sentMessages?.forEach(msg => {
            totalViews += msg.metrics?.views || 0
            totalForwards += msg.metrics?.forwards || 0
            totalReplies += msg.metrics?.replies || 0
            totalReactions += msg.metrics?.reactions || 0
        })
    })

    return (
        <div className="space-y-4 animate-in pb-10">
            <header className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold mb-2 text-gray-900">Analytics & Data</h1>
                    <p className="text-gray-500">Track performance and engagement of your broadcasts.</p>
                </div>
                <button
                    onClick={exportDatasheet}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 font-bold transition-colors text-white shadow-lg shadow-primary-500/20"
                >
                    <Download className="w-5 h-5" />
                    Export Datasheet
                </button>
            </header>

            {/* Filter Controls */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 card-shadow flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-700">Date Range:</span>
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none text-sm font-medium"
                    >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="7days">Last 7 Days</option>
                        <option value="30days">Last 30 Days</option>
                        <option value="custom">Custom Range</option>
                    </select>
                </div>

                {dateRange === 'custom' && (
                    <div className="flex gap-2 items-center animate-in fade-in slide-in-from-left-4">
                        <input
                            type="date"
                            value={customDateFrom}
                            onChange={(e) => setCustomDateFrom(e.target.value)}
                            className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:border-primary-500 focus:outline-none text-sm"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            value={customDateTo}
                            onChange={(e) => setCustomDateTo(e.target.value)}
                            className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:border-primary-500 focus:outline-none text-sm"
                        />
                    </div>
                )}
            </div>

            {/* Growth Analytics Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 1. Community Growth (Joined/Left) */}
                <div className="bg-white p-4 rounded-2xl card-shadow border border-gray-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <TrendingUp className="w-6 h-6 text-green-600" />
                                Community Flow (Joined/Left)
                            </h3>
                            <p className="text-sm text-gray-500">Daily member changes.</p>
                        </div>
                        <select
                            className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2.5"
                            value={selectedChannel}
                            onChange={(e) => setSelectedChannel(e.target.value)}
                        >
                            <option value="">Select Channel</option>
                            {channels.map(c => (
                                <option key={c.telegramId} value={c.telegramId}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {isLoadingGrowth ? (
                        <div className="h-80 flex items-center justify-center bg-gray-50 rounded-xl">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : followersGraphData.length > 0 ? (
                        <div className="h-80 w-full min-h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={followersGraphData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                    <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#6b7280', fontSize: 12 }} />
                                    <YAxis stroke="#9ca3af" tick={{ fill: '#6b7280', fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    {/* Try to match standard keys, or map from parsing. 
                                        Usually 'joined' and 'left'. We iterate keys blindly or guess? 
                                        Let's assume 'joined' and 'left' keys exist if the parser found them in 'names'.
                                        If exact keys unknown, we can map over keys of first item?
                                    */}
                                    <Bar dataKey="joined" name="Joined" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="left" name="Left" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="unsubscribed" name="Left" fill="#ef4444" radius={[4, 4, 0, 0]} /> {/* Fallback key */}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-80 flex flex-col items-center justify-center bg-gray-50 rounded-xl text-gray-400">
                            <Users className="w-12 h-12 mb-2 opacity-20" />
                            <p>No joined/left data or permission denied.</p>
                            <p className="text-xs mt-1">Check Admin rights.</p>
                        </div>
                    )}
                </div>

                {/* 2. Total Followers (Growth) */}
                <div className="bg-white p-4 rounded-2xl card-shadow border border-gray-100">
                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-6 h-6 text-blue-600" />
                            Total Subscribers
                        </h3>
                        <p className="text-sm text-gray-500">Overall growth trend.</p>
                    </div>

                    {isLoadingGrowth ? (
                        <div className="h-80 flex items-center justify-center bg-gray-50 rounded-xl">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : growthGraphData.length > 0 ? (
                        <div className="h-80 w-full min-h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={growthGraphData}>
                                    <defs>
                                        <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                    <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#6b7280', fontSize: 12 }} />
                                    <YAxis domain={['auto', 'auto']} stroke="#9ca3af" tick={{ fill: '#6b7280', fontSize: 12 }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px' }} />
                                    <Area type="monotone" dataKey="followers" name="Subscribers" stroke="#3b82f6" fillOpacity={1} fill="url(#colorFollowers)" strokeWidth={3} />
                                    <Area type="monotone" dataKey="subscribers" name="Subscribers" stroke="#3b82f6" fillOpacity={1} fill="url(#colorFollowers)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-80 flex flex-col items-center justify-center bg-gray-50 rounded-xl text-gray-400">
                            <Users className="w-12 h-12 mb-2 opacity-20" />
                            <p>No growth data available.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border-l-4 border-blue-500 card-shadow">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <Eye className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-bold">Post Views</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{totalViews.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border-l-4 border-purple-500 card-shadow">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <Share2 className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-bold">Forwards</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{totalForwards.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border-l-4 border-pink-500 card-shadow">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <Heart className="w-4 h-4 text-pink-500" />
                        <span className="text-sm font-bold">Reactions</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{totalReactions.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border-l-4 border-green-500 card-shadow">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <MessageSquare className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-bold">Replies</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{totalReplies.toLocaleString()}</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl card-shadow border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-900">Delivery Performance</h3>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setChartView('daily')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${chartView === 'daily' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Daily
                            </button>
                            <button
                                onClick={() => setChartView('tasks')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${chartView === 'tasks' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Individual Tasks
                            </button>
                        </div>
                    </div>
                    <div className="h-80 w-full min-h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ bottom: 20, left: 10, right: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                <XAxis
                                    dataKey={chartView === 'tasks' ? "uniqueKey" : "uniqueKey"}
                                    stroke="#9ca3af"
                                    tick={{ fill: '#6b7280', fontSize: 10 }}
                                    interval={0}
                                    angle={chartView === 'tasks' ? -45 : 0}
                                    textAnchor={chartView === 'tasks' ? "end" : "middle"}
                                    height={chartView === 'tasks' ? 70 : 30}
                                    tickFormatter={(val) => {
                                        if (chartView === 'daily') return val;
                                        // "Name__Date__ID" -> "Name" only
                                        const parts = val.split('__');
                                        const name = parts[0];
                                        return name.length > 15 ? name.substring(0, 15) + '...' : name;
                                    }}
                                />
                                <YAxis
                                    stroke="#9ca3af"
                                    tick={{ fill: '#6b7280', fontSize: 11 }}
                                    allowDecimals={false}
                                />
                                <Tooltip content={<CustomTooltip chartView={chartView} />} cursor={{ fill: '#f9fafb' }} />
                                <Bar dataKey="success" fill="#22c55e" name="Success" radius={[4, 4, 0, 0]} barSize={chartView === 'tasks' ? 20 : undefined} />
                                <Bar dataKey="failed" fill="#ef4444" name="Failed" radius={[4, 4, 0, 0]} barSize={chartView === 'tasks' ? 20 : undefined} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl card-shadow border border-gray-100">
                    <h3 className="text-xl font-bold mb-6 text-gray-900">Recent Activity</h3>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        {tasks.slice(0, 10).map(task => {
                            const views = task.sentMessages?.reduce((a, m) => a + (m.metrics?.views || 0), 0) || 0
                            const reacts = task.sentMessages?.reduce((a, m) => a + (m.metrics?.reactions || 0), 0) || 0

                            return (
                                <div key={task._id} className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3 hover:bg-white hover:shadow-sm transition-all">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold text-gray-900">{task.name}</h4>
                                            <p className="text-xs text-gray-500">{new Date(task.createdAt).toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => refreshMutation.mutate(task.taskId)}
                                                disabled={refreshMutation.isPending}
                                                className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-primary-50 text-gray-500 hover:text-primary-600 transition-colors"
                                                title="Refresh Metrics"
                                            >
                                                <RefreshCw className={`w-4 h-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                                            </button>
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${task.status === 'completed' ? 'bg-green-50 text-green-600 border-green-200' :
                                                task.status === 'failed' ? 'bg-red-50 text-red-600 border-red-200' :
                                                    'bg-blue-50 text-blue-600 border-blue-200'
                                                }`}>
                                                {task.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-2 border-t border-gray-200">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                            <Eye className="w-3.5 h-3.5 text-blue-500" />
                                            {views}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                            <Heart className="w-3.5 h-3.5 text-pink-500" />
                                            {reacts}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                            {task.results?.success || 0} sent
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
export default Analytics;
