import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import FolderManager from './pages/FolderManager'
import SendMessage from './pages/SendMessage'
import QuizBuilder from './pages/QuizBuilder'
import History from './pages/History'
import Analytics from './pages/Analytics'
import DataTracking from './pages/DataTracking'
import Settings from './pages/Settings'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import PhoneLogin from './pages/PhoneLogin'
import AdminApprovals from './pages/AdminApprovals'
import AdminUsers from './pages/AdminUsers'
import ConnectTelegram from './pages/ConnectTelegram'
import TelegramApp from './pages/TelegramApp'

function App() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-gray-500 animate-pulse">Loading...</div>
            </div>
        );
    }

    if (!user) {
        return (
            <Routes>
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/phone-login" element={<PhoneLogin />} />
                <Route path="*" element={<Navigate to="/signin" replace />} />
            </Routes>
        );
    }

    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />

                {/* Protected Routes for Admin/Moderator Only */}
                {['admin', 'moderator'].includes(user.role) && (
                    <>
                        <Route path="folders" element={<FolderManager />} />
                        <Route path="quiz" element={<QuizBuilder />} />
                    </>
                )}

                <Route path="send" element={<SendMessage />} />
                <Route path="history" element={<History />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="tracking" element={<DataTracking />} />
                <Route path="settings" element={<Settings />} />
                <Route path="tg-app" element={<TelegramApp />} />
                <Route path="phone-login" element={<PhoneLogin />} />

                {user.role === 'admin' && (
                    <>
                        <Route path="admin/approvals" element={<AdminApprovals />} />
                        <Route path="admin/users" element={<AdminUsers />} />
                        <Route path="admin/connect-telegram" element={<ConnectTelegram />} />
                    </>
                )}
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default App
