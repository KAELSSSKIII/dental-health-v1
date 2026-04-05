import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Calendar, Clock, Banknote, Eye, UserPlus } from 'lucide-react';
import client from '../api/client';
import { formatDate, formatName, calcAge, formatCurrency } from '../utils/helpers';
import { VISIT_TYPE_COLORS } from '../utils/constants';

const fadeUp = (i) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.08, duration: 0.4 },
});

function StatCard({ icon: Icon, label, value, color, index }) {
    return (
        <motion.div {...fadeUp(index)} className="card flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-7 h-7" />
            </div>
            <div>
                <p className="text-text-secondary text-sm font-medium">{label}</p>
                <p className="text-2xl font-bold text-text-primary mt-0.5">{value ?? '—'}</p>
            </div>
        </motion.div>
    );
}

function SkeletonRow() {
    return (
        <tr>
            {[1, 2, 3, 4, 5].map(i => (
                <td key={i} className="px-4 py-3"><div className="skeleton h-4 rounded w-full" /></td>
            ))}
        </tr>
    );
}

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await client.get('/dashboard/stats');
                setStats(res.data);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <div className="space-y-6 animate-fade-up">
            <div>
                <h1 className="font-display text-2xl font-bold text-text-primary">Dashboard</h1>
                <p className="text-text-secondary text-sm">Overview of today's clinic activity</p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard index={0} icon={Users} label="Total Patients" value={stats?.totalPatients} color="bg-teal-50 text-teal-600" />
                <StatCard index={1} icon={Calendar} label="Today's Visits" value={stats?.visitsToday} color="bg-blue-50 text-blue-600" />
                <StatCard index={2} icon={Clock} label="Upcoming Appointments" value={stats?.upcomingAppointments} color="bg-amber-50 text-amber-600" />
                <StatCard index={3} icon={Banknote} label="Monthly Revenue" value={stats ? formatCurrency(stats.monthlyRevenue) : null} color="bg-green-50 text-green-700" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                {/* Recent patients */}
                <motion.div {...fadeUp(4)} className="card xl:col-span-3">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-text-primary">Recent Patients</h2>
                        <Link to="/patients" className="text-primary text-sm font-medium hover:underline">View all →</Link>
                    </div>
                    <div className="overflow-x-auto -mx-2">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    {['Name', 'Age', 'Last Visit', 'Issues', ''].map(h => (
                                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    [1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)
                                ) : stats?.recentPatients?.length ? (
                                    stats.recentPatients.map(p => (
                                        <tr key={p.id} className="border-b border-border/50 hover:bg-bg/60 transition-colors">
                                            <td className="px-4 py-3 font-medium text-text-primary">{formatName(p, 'last-first')}</td>
                                            <td className="px-4 py-3 text-text-secondary">{calcAge(p.date_of_birth)} yrs</td>
                                            <td className="px-4 py-3 text-text-secondary">{p.last_visit ? formatDate(p.last_visit) : 'No visits'}</td>
                                            <td className="px-4 py-3">
                                                {parseInt(p.dental_issues) > 0
                                                    ? <span className="badge-red">{p.dental_issues} issue{p.dental_issues !== '1' ? 's' : ''}</span>
                                                    : <span className="badge-green">Healthy</span>
                                                }
                                            </td>
                                            <td className="px-4 py-3">
                                                <Link to={`/patients/${p.id}`} className="btn-ghost text-xs py-1.5 px-3">
                                                    <Eye className="w-3.5 h-3.5" /> View
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={5} className="px-4 py-8 text-center text-text-secondary">No patients yet</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* Today's schedule */}
                <motion.div {...fadeUp(5)} className="card xl:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-text-primary">Today's Schedule</h2>
                        <Link to="/patients/new" className="btn-primary text-xs px-3 py-1.5">
                            <UserPlus className="w-3.5 h-3.5" /> Add
                        </Link>
                    </div>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-lg" />)}
                        </div>
                    ) : stats?.todaysSchedule?.length ? (
                        <div className="space-y-2">
                            {stats.todaysSchedule.map(v => (
                                <Link
                                    key={v.id}
                                    to={`/patients/${v.patient_id}`}
                                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-bg hover:border-primary/30 transition-all"
                                >
                                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                        {formatDate(v.visit_date, 'h:mm')}
                                        <span className="text-[9px] ml-0.5">{formatDate(v.visit_date, 'a')}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-text-primary truncate">{v.first_name} {v.last_name}</p>
                                        <span className={`badge text-xs ${VISIT_TYPE_COLORS[v.visit_type] || 'badge-gray'}`}>
                                            {v.visit_type?.replace('_', ' ')}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Calendar className="w-8 h-8 text-border mx-auto mb-2" />
                            <p className="text-text-secondary text-sm">No appointments today</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
