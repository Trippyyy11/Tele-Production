import { ExternalLink, Send, Shield, Users, Zap, MessageCircle, Monitor } from 'lucide-react'

function TelegramApp() {
    return (
        <div className="space-y-8 animate-in pb-10">
            <header className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold mb-2 text-gray-900">Telegram Environment</h1>
                    <p className="text-gray-500">Manage and interact with your connected Telegram ecosystem.</p>
                </div>
                <a
                    href="https://web.telegram.org/a/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 font-bold transition-all text-white shadow-lg shadow-blue-500/30 transform active:scale-[0.98]"
                >
                    <ExternalLink className="w-5 h-5" />
                    Open Web Telegram
                </a>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Desktop Mockup Section */}
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-3xl overflow-hidden card-shadow border border-gray-100 flex flex-col h-[600px]">
                        {/* Mock Title Bar */}
                        <div className="bg-gray-100 px-4 py-2 flex items-center gap-2 border-b border-gray-200">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                <div className="w-3 h-3 rounded-full bg-amber-400" />
                                <div className="w-3 h-3 rounded-full bg-green-400" />
                            </div>
                            <div className="flex-1 text-center">
                                <span className="text-xs font-bold text-gray-400 flex items-center justify-center gap-1">
                                    <Monitor className="w-3 h-3" />
                                    Telegram Desktop (Connected)
                                </span>
                            </div>
                        </div>

                        {/* Mock App Content */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* Mock Sidebar */}
                            <div className="w-64 bg-white border-r border-gray-100 flex flex-col">
                                <div className="p-4 border-b border-gray-50">
                                    <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
                                </div>
                                <div className="flex-1 p-2 space-y-2">
                                    {[1, 2, 3, 4, 5, 6].map(i => (
                                        <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 font-bold text-xs">
                                                CH
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="h-3 w-20 bg-gray-100 rounded mb-1" />
                                                <div className="h-2 w-32 bg-gray-50 rounded" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Mock Chat Area */}
                            <div className="flex-1 bg-gray-50 flex flex-col relative overflow-hidden">
                                {/* Telegram Background Pattern Mock */}
                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }} />

                                <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                                            TP
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 leading-none">Teaching Pariksha Community</h3>
                                            <span className="text-[11px] text-green-500 font-medium">124.5k members • online</span>
                                        </div>
                                    </div>
                                    <Shield className="w-5 h-5 text-gray-400" />
                                </div>

                                <div className="flex-1 p-6 space-y-4 overflow-y-auto z-10 flex flex-col justify-end">
                                    <div className="max-w-[80%] bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100">
                                        <p className="text-sm text-gray-800">Welcome to the official broadcaster integration!</p>
                                        <span className="text-[10px] text-gray-400 mt-1 block">14:32</span>
                                    </div>
                                    <div className="max-w-[80%] bg-blue-500 text-white p-3 rounded-2xl rounded-tr-none shadow-sm self-end ml-auto">
                                        <p className="text-sm">Campaign "Q1 Launch" has been successfully scheduled.</p>
                                        <span className="text-[10px] text-blue-100 mt-1 block text-right">14:33</span>
                                    </div>
                                </div>

                                <div className="p-4 bg-white border-t border-gray-100 z-10">
                                    <div className="bg-gray-50 rounded-xl px-4 py-2.5 flex items-center gap-3">
                                        <div className="flex-1 text-sm text-gray-400">Broadcast message...</div>
                                        <Send className="w-5 h-5 text-blue-500 cursor-pointer" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Cards Section */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-3xl text-white shadow-xl shadow-blue-500/20">
                        <Zap className="w-10 h-10 mb-4 text-blue-200" />
                        <h3 className="text-xl font-bold mb-2">Instant Connection</h3>
                        <p className="text-blue-100 text-sm leading-relaxed mb-4">
                            Your dashboard is now direct-linked to the Telegram API. Every action here reflects instantly in the official apps.
                        </p>
                        <div className="space-y-3">
                            <FeatureItem icon={<MessageCircle className="w-4 h-4" />} label="Real-time Synchronization" />
                            <FeatureItem icon={<Shield className="w-4 h-4" />} label="End-to-End Security" />
                            <FeatureItem icon={<Users className="w-4 h-4" />} label="Mass Group Management" />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl card-shadow border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4">Account Statistics</h3>
                        <div className="space-y-4">
                            <StatRow label="Active Sessions" value="2" color="bg-green-100 text-green-600" />
                            <StatRow label="Connected Type" value="User + Bot" color="bg-blue-100 text-blue-600" />
                            <StatRow label="API Status" value="Online" color="bg-green-100 text-green-600" />
                        </div>
                        <button className="w-full mt-6 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 font-bold hover:border-blue-200 hover:text-blue-500 hover:bg-blue-50 transition-all">
                            Manage API Credentials
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function FeatureItem({ icon, label }) {
    return (
        <div className="flex items-center gap-3 text-sm font-medium text-blue-50">
            <div className="p-1.5 bg-white/10 rounded-lg">{icon}</div>
            {label}
        </div>
    )
}

function StatRow({ label, value, color }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 font-medium">{label}</span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${color}`}>{value}</span>
        </div>
    )
}

export default TelegramApp
