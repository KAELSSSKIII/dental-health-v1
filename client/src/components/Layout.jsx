import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { getInitials } from '../utils/helpers';

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { admin } = useAuth();

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <div className="flex h-screen overflow-hidden bg-bg">
            {/* Desktop sidebar (always visible) */}
            <div className="hidden lg:flex lg:w-64 lg:shrink-0">
                <Sidebar open={true} onClose={() => { }} />
            </div>

            {/* Mobile sidebar */}
            <div className="lg:hidden">
                <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top bar */}
                <header className="h-16 bg-white border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button
                            className="lg:hidden btn-icon"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="hidden sm:block">
                            <p className="text-sm font-semibold text-text-primary">
                                {greeting()}, {admin?.full_name?.split(' ')[0] || 'Doctor'}
                            </p>
                            <p className="text-xs text-text-secondary">
                                {format(new Date(), "EEEE, MMMM d, yyyy")}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="btn-icon relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full"></span>
                        </button>
                        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm cursor-pointer hover:bg-primary-light transition-colors">
                            {getInitials(admin?.full_name || 'A')}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
