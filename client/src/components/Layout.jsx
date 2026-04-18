import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu, Bell, Calendar, Clock } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { getInitials, capitalize } from '../utils/helpers';
import client from '../api/client';

function NotificationDropdown({ onClose }) {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const ref = useRef(null);

    useEffect(() => {
        client.get('/appointments/notifications')
            .then(r => setData(r.data))
            .catch(() => setData({ pending: [], today: [] }))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) onClose();
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [onClose]);

    const goToAppointments = () => {
        navigate('/appointments');
        onClose();
    };

    const total = (data?.pending?.length || 0) + (data?.today?.length || 0);

    return (
        <div ref={ref}
            className="absolute right-0 top-full mt-2 w-80 bg-white border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
                <p className="font-semibold text-text-primary text-sm">Notifications</p>
                {!loading && total > 0 && (
                    <span className="text-xs font-bold bg-primary text-white px-2 py-0.5 rounded-full">{total}</span>
                )}
            </div>

            <div className="max-h-96 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-10">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : total === 0 ? (
                    <div className="py-10 text-center">
                        <Bell className="w-8 h-8 text-border mx-auto mb-2" />
                        <p className="text-sm text-text-secondary">You're all caught up!</p>
                    </div>
                ) : (
                    <>
                        {/* Pending requests */}
                        {data.pending.length > 0 && (
                            <div>
                                <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                                    Pending Requests
                                </p>
                                {data.pending.map(appt => (
                                    <button key={appt.id}
                                        onClick={goToAppointments}
                                        className="w-full text-left px-4 py-3 hover:bg-surface transition-colors flex items-start gap-3 border-b border-border/40 last:border-0">
                                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                                            <Clock className="w-4 h-4 text-amber-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-text-primary truncate">
                                                {appt.last_name}, {appt.first_name}
                                            </p>
                                            <p className="text-xs text-text-secondary mt-0.5">
                                                Requested {capitalize(appt.appointment_type)} ·{' '}
                                                {format(new Date(appt.appointment_date), 'MMM d, h:mm a')}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Today's schedule */}
                        {data.today.length > 0 && (
                            <div>
                                <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                                    Today's Schedule
                                </p>
                                {data.today.map(appt => (
                                    <button key={appt.id}
                                        onClick={goToAppointments}
                                        className="w-full text-left px-4 py-3 hover:bg-surface transition-colors flex items-start gap-3 border-b border-border/40 last:border-0">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                            <Calendar className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-text-primary truncate">
                                                {appt.last_name}, {appt.first_name}
                                            </p>
                                            <p className="text-xs text-text-secondary mt-0.5">
                                                {capitalize(appt.appointment_type)} · {format(new Date(appt.appointment_date), 'h:mm a')}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-border bg-surface">
                <button onClick={goToAppointments}
                    className="text-xs font-semibold text-primary hover:underline w-full text-center">
                    View all appointments →
                </button>
            </div>
        </div>
    );
}

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [bellOpen, setBellOpen] = useState(false);
    const [badgeCount, setBadgeCount] = useState(0);
    const { admin } = useAuth();

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    };

    // Fetch badge count on mount
    useEffect(() => {
        client.get('/appointments/notifications')
            .then(r => setBadgeCount((r.data.pending?.length || 0) + (r.data.today?.length || 0)))
            .catch(() => {});
    }, []);

    const handleBellClose = useCallback(() => setBellOpen(false), []);

    return (
        <div className="flex h-screen overflow-hidden bg-bg">
            {/* Desktop sidebar */}
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
                        <button className="lg:hidden btn-icon" onClick={() => setSidebarOpen(true)}>
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
                        {/* Bell */}
                        <div className="relative">
                            <button
                                className="btn-icon relative"
                                onClick={() => setBellOpen(o => !o)}
                            >
                                <Bell className="w-5 h-5" />
                                {badgeCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                                        {badgeCount > 9 ? '9+' : badgeCount}
                                    </span>
                                )}
                            </button>
                            {bellOpen && <NotificationDropdown onClose={handleBellClose} />}
                        </div>

                        {/* Avatar */}
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
