import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import {
    LayoutDashboard,
    FolderKanban,
    Send,
    HelpCircle,
    History,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    Users,
    UserCheck,
    Trash2,
    ChevronDown,
    Shield,
    Unplug,
    X,
    TrendingUp,
    AppWindow
} from 'lucide-react'
import { getAuthStatus, clearHistory } from '../services/api'
import { useState } from 'react'

function Navbar({ onOpenAuth }) {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { user, logout } = useAuth()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isAdminOpen, setIsAdminOpen] = useState(false)

    const { data: status, isLoading } = useQuery({
        queryKey: ['authStatus'],
        queryFn: getAuthStatus,
        refetchInterval: 10000
    })

    const logoutMutation = useMutation({
        mutationFn: async () => {
            try {
                await axios.post('/api/auth/logout')
            } catch (error) {
                // Ignore errors during logout (e.g. 401 if already expired)
                console.warn('Logout API call failed, proceeding with local logout:', error.message)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries(['authStatus'])
            logout()
        }
    })

    const handleClearHistory = async () => {
        if (window.confirm('Are you sure you want to clear all broadcast history? This action cannot be undone.')) {
            try {
                await clearHistory()
                queryClient.invalidateQueries(['tasks'])
                alert('History cleared successfully')
            } catch (error) {
                console.error('Failed to clear history:', error)
                alert('Failed to clear history')
            }
        }
    }

    const isConnected = status?.connected && status?.mode === 'User (Permanent)'

    const navItems = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/folders', icon: FolderKanban, label: 'Folders', roles: ['admin', 'moderator'] },
        { path: '/send', icon: Send, label: 'Message', roles: ['admin', 'moderator'] },
        { path: '/quiz', icon: HelpCircle, label: 'Quiz', roles: ['admin', 'moderator'] },
        { path: '/history', icon: History, label: 'History' },
        { path: '/tracking', icon: BarChart3, label: 'Tracking' },
        { path: '/analytics', icon: TrendingUp, label: 'Analytics' },
        { path: 'tg://', icon: AppWindow, label: 'Telegram App' },
    ].filter(item => !item.roles || item.roles.includes(user?.role || 'viewer'));

    const adminNavItems = [
        { path: '/admin/approvals', icon: UserCheck, label: 'Approvals', roles: ['admin'] },
        { path: '/admin/users', icon: Users, label: 'Users', roles: ['admin'] },
        { label: 'Clear History', icon: Trash2, action: handleClearHistory, roles: ['admin'], className: 'text-red-500 hover:text-red-600 hover:bg-red-50' },
    ]

    const filteredAdminNavItems = adminNavItems.filter(item => {
        // Check role permission
        if (item.roles && !item.roles.includes(user?.role)) return false;
        // Hide Connect Telegram if already connected (though this logic was for tg link usually)
        if (isConnected && item.path === 'https://web.telegram.org/a/') return false;
        return true;
    });

    const NavItem = ({ item, onClick, className, isChild }) => {
        const isExternal = item.path && item.path.startsWith('http') || item.path === 'tg://';
        const isAction = !!item.action;

        const content = (
            <>
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
            </>
        );

        const baseStyles = `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isChild ? 'pl-9 text-sm' : ''} ${item.className || ''}`;

        const activeStyles = "bg-primary-50 text-primary-600 shadow-sm shadow-primary-500/10";
        const inactiveStyles = "text-gray-500 hover:text-primary-600 hover:bg-gray-50";

        if (isAction) {
            return (
                <button
                    onClick={() => {
                        item.action();
                        if (onClick) onClick();
                    }}
                    className={`${baseStyles} ${inactiveStyles} w-full text-left`}
                >
                    {content}
                </button>
            )
        }

        if (isExternal) {
            const isHttp = item.path.startsWith('http');
            return (
                <a
                    href={item.path}
                    target={isHttp ? "_blank" : undefined}
                    rel={isHttp ? "noopener noreferrer" : undefined}
                    className={`${baseStyles} ${inactiveStyles}`}
                    onClick={onClick}
                >
                    {content}
                </a>
            );
        }

        return (
            <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                    `${baseStyles} ${isActive ? activeStyles : inactiveStyles}`
                }
                onClick={onClick}
            >
                {content}
            </NavLink>
        );
    };

    return (
        <nav className="bg-white border-r border-gray-100 h-full flex flex-col shadow-lg shadow-gray-200/50 md:shadow-none">
            {/* Logo Section */}
            <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-3">
                    <img
                        src="/images/TP logo.png"
                        alt="Logo"
                        className="h-8 w-auto object-contain"
                    />
                    <span className="font-bold text-xl text-gray-900 hidden md:block">Broadcaster</span>
                </div>
                {/* Mobile menu button */}
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                >
                    {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Navigation Links */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-1 ${isMobileMenuOpen ? 'block' : 'hidden md:block'}`}>
                {navItems.map((item) => (
                    <NavItem key={item.path} item={item} onClick={() => setIsMobileMenuOpen(false)} />
                ))}

                {/* Admin Section */}
                {user?.role === 'admin' && (
                    <div className="pt-4 mt-4 border-t border-gray-100">
                        <button
                            onClick={() => setIsAdminOpen(!isAdminOpen)}
                            className="flex items-center justify-between w-full px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider hover:text-gray-600"
                        >
                            <span>Admin Controls</span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${isAdminOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isAdminOpen && (
                            <div className="mt-1 space-y-1">
                                {filteredAdminNavItems.map((item) => (
                                    <NavItem
                                        key={item.path || item.label}
                                        item={item}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        isChild
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer Section (User Profile & Status) */}
            <div className={`p-4 border-t border-gray-100 bg-gray-50/50 ${isMobileMenuOpen ? 'block' : 'hidden md:block'}`}>
                <div className="space-y-3">
                    {/* Connection Status */}
                    {['admin', 'moderator'].includes(user?.role) && (
                        <div>
                            {isLoading ? (
                                <div className="h-10 bg-gray-200 rounded-xl animate-pulse" />
                            ) : isConnected ? (
                                <div className="flex items-center gap-3 p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-tight">Connected Profile</p>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black truncate leading-tight">
                                                {status.user?.firstName} {status.user?.lastName}
                                            </span>
                                            {status.user?.username && (
                                                <span className="text-[11px] font-medium text-blue-500/80 truncate">
                                                    @{status.user.username}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => navigate('/phone-login')}
                                    className="w-full flex items-center justify-center gap-2 p-3 bg-white text-gray-700 hover:text-primary-600 border border-gray-200 hover:border-primary-200 rounded-xl transition-all shadow-sm"
                                >
                                    <Unplug className="w-4 h-4" />
                                    <span className="text-sm font-bold">Connect Telegram</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Settings & Logout */}
                    {user && (
                        <div className="flex items-center gap-2 pt-2">
                            {['admin', 'moderator'].includes(user?.role) && (
                                <button
                                    onClick={() => navigate('/settings')}
                                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-white rounded-lg transition-all"
                                    title="Settings"
                                >
                                    <Settings className="w-5 h-5" />
                                </button>
                            )}
                            <div className="flex-1"></div>
                            <button
                                onClick={() => {
                                    if (['admin', 'moderator'].includes(user?.role)) {
                                        logoutMutation.mutate();
                                    } else {
                                        logout();
                                    }
                                }}
                                className="flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-all text-sm font-medium"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Logout</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    )
}

export default Navbar
