import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Users, UserPlus, Calendar, Settings, LogOut, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getInitials, capitalize } from '../utils/helpers';

const navItems = [
    { to: '/dashboard',    icon: Home,     label: 'Dashboard'    },
    { to: '/appointments', icon: Calendar, label: 'Appointments' },
    { to: '/patients',     icon: Users,    label: 'Patients'     },
    { to: '/patients/new', icon: UserPlus, label: 'Add Patient'  },
    { to: '/settings',     icon: Settings, label: 'Settings'     },
];

export default function Sidebar({ open, onClose }) {
    const { admin, logout } = useAuth();

    return (
        <>
            {/* Mobile overlay */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar panel */}
            <motion.aside
                className={`
          fixed inset-y-0 left-0 z-40 w-64 flex flex-col
          bg-gradient-to-b from-primary-dark via-primary to-primary-light
          lg:static lg:z-auto lg:translate-x-0
        `}
                initial={false}
                animate={{ x: open ? 0 : '-100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                style={{ boxShadow: '4px 0 24px rgba(10,74,64,0.2)' }}
            >
                {/* Logo */}
                <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
                    <img src="/logo.png" alt="Clinic Logo" className="w-44 h-auto object-contain" />
                    <button onClick={onClose} className="lg:hidden text-white/70 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {navItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={onClose}
                            className={({ isActive }) =>
                                `nav-item ${isActive ? 'active' : ''}`
                            }
                        >
                            <item.icon className="w-5 h-5 shrink-0" />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* User footer */}
                <div className="px-3 py-4 border-t border-white/10">
                    <div className="flex items-center gap-3 px-2 py-2 mb-2">
                        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {getInitials(admin?.full_name || 'Admin')}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-semibold truncate">{admin?.full_name}</p>
                            <p className="text-white/60 text-xs">{capitalize(admin?.role || 'admin')}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full nav-item text-white/70 hover:text-red-300 hover:bg-red-500/10"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </motion.aside>
        </>
    );
}
