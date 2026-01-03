import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import TelegramAuthModal from './TelegramAuthModal'

function Layout() {
    const [isAuthOpen, setIsAuthOpen] = useState(false)

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
            {/* Sidebar Navigation */}
            <aside className="w-full md:w-64 flex-shrink-0 md:h-screen md:sticky md:top-0 z-50">
                <Navbar onOpenAuth={() => setIsAuthOpen(true)} />
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>

            <TelegramAuthModal
                isOpen={isAuthOpen}
                onClose={() => setIsAuthOpen(false)}
            />
        </div>
    )
}

export default Layout
