import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Building2, Users, Eye, EyeOff, Plus, Pencil,
    ToggleLeft, ToggleRight, X, Save, KeyRound, ShieldCheck
} from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/helpers';
import { useToast } from '../components/Toast';

const TABS = [
    { key: 'account', label: 'Account', icon: User },
    { key: 'clinic', label: 'Clinic Info', icon: Building2 },
    { key: 'users', label: 'Users', icon: Users },
];

const ROLES = ['admin', 'dentist', 'hygienist', 'receptionist'];

const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Label({ children }) {
    return <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">{children}</label>;
}

function FieldGroup({ label, children }) {
    return (
        <div>
            <Label>{label}</Label>
            {children}
        </div>
    );
}

function SectionTitle({ children }) {
    return <h3 className="font-semibold text-text-primary mb-4">{children}</h3>;
}

function SaveButton({ loading, label = 'Save Changes' }) {
    return (
        <button type="submit" disabled={loading} className="btn-primary">
            <Save className="w-4 h-4" />
            {loading ? 'Saving…' : label}
        </button>
    );
}

// ─── Account Tab ─────────────────────────────────────────────────────────────

function AccountTab() {
    const { admin, fetchMe } = useAuth();
    const { showToast } = useToast();

    const [profile, setProfile] = useState({ full_name: '', email: '', username: '' });
    const [profileLoading, setProfileLoading] = useState(false);

    const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
    const [pwdLoading, setPwdLoading] = useState(false);
    const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });

    useEffect(() => {
        if (admin) {
            setProfile({ full_name: admin.full_name || '', email: admin.email || '', username: admin.username || '' });
        }
    }, [admin]);

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        try {
            await client.put('/settings/profile', profile);
            await fetchMe();
            showToast('Profile updated successfully', 'success');
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to update profile', 'error');
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (pwd.newPassword !== pwd.confirm) {
            showToast('New passwords do not match', 'error');
            return;
        }
        setPwdLoading(true);
        try {
            await client.put('/auth/change-password', {
                currentPassword: pwd.currentPassword,
                newPassword: pwd.newPassword,
            });
            setPwd({ currentPassword: '', newPassword: '', confirm: '' });
            showToast('Password changed successfully', 'success');
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to change password', 'error');
        } finally {
            setPwdLoading(false);
        }
    };

    const toggleShow = (field) => setShowPwd(s => ({ ...s, [field]: !s[field] }));

    return (
        <div className="space-y-6">
            {/* Profile */}
            <div className="card">
                <SectionTitle>Profile Information</SectionTitle>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FieldGroup label="Full Name">
                            <input
                                className="form-input"
                                value={profile.full_name}
                                onChange={e => setProfile(s => ({ ...s, full_name: e.target.value }))}
                                required
                            />
                        </FieldGroup>
                        <FieldGroup label="Username">
                            <input
                                className="form-input"
                                value={profile.username}
                                onChange={e => setProfile(s => ({ ...s, username: e.target.value }))}
                                required
                                minLength={3}
                            />
                        </FieldGroup>
                    </div>
                    <FieldGroup label="Email">
                        <input
                            type="email"
                            className="form-input"
                            value={profile.email}
                            onChange={e => setProfile(s => ({ ...s, email: e.target.value }))}
                            required
                        />
                    </FieldGroup>
                    <div className="pt-1">
                        <SaveButton loading={profileLoading} />
                    </div>
                </form>
            </div>

            {/* Password */}
            <div className="card">
                <div className="flex items-center gap-2 mb-4">
                    <KeyRound className="w-4 h-4 text-text-secondary" />
                    <SectionTitle>Change Password</SectionTitle>
                </div>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    {[
                        { key: 'current', label: 'Current Password', field: 'currentPassword' },
                        { key: 'new', label: 'New Password', field: 'newPassword' },
                        { key: 'confirm', label: 'Confirm New Password', field: 'confirm' },
                    ].map(({ key, label, field }) => (
                        <FieldGroup key={key} label={label}>
                            <div className="relative">
                                <input
                                    type={showPwd[key] ? 'text' : 'password'}
                                    className="form-input pr-10"
                                    value={pwd[field]}
                                    onChange={e => setPwd(s => ({ ...s, [field]: e.target.value }))}
                                    required
                                    minLength={field === 'currentPassword' ? 1 : 6}
                                />
                                <button
                                    type="button"
                                    onClick={() => toggleShow(key)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                                >
                                    {showPwd[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </FieldGroup>
                    ))}
                    <div className="pt-1">
                        <SaveButton loading={pwdLoading} label="Change Password" />
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Clinic Tab ───────────────────────────────────────────────────────────────

function ClinicTab() {
    const { showToast } = useToast();
    const [form, setForm] = useState({ clinic_name: '', address: '', phone: '', email: '', website: '' });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await client.get('/settings/clinic');
                setForm({
                    clinic_name: res.data.clinic_name || '',
                    address: res.data.address || '',
                    phone: res.data.phone || '',
                    email: res.data.email || '',
                    website: res.data.website || '',
                });
            } catch {
                showToast('Failed to load clinic info', 'error');
            } finally {
                setFetching(false);
            }
        })();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await client.put('/settings/clinic', form);
            showToast('Clinic info saved', 'success');
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to save clinic info', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="card space-y-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-10 rounded" />)}
            </div>
        );
    }

    return (
        <div className="card">
            <SectionTitle>Clinic Information</SectionTitle>
            <form onSubmit={handleSubmit} className="space-y-4">
                <FieldGroup label="Clinic Name">
                    <input
                        className="form-input"
                        value={form.clinic_name}
                        onChange={e => setForm(s => ({ ...s, clinic_name: e.target.value }))}
                        required
                    />
                </FieldGroup>
                <FieldGroup label="Address">
                    <textarea
                        className="form-input resize-none"
                        rows={2}
                        value={form.address}
                        onChange={e => setForm(s => ({ ...s, address: e.target.value }))}
                    />
                </FieldGroup>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldGroup label="Phone">
                        <input
                            className="form-input"
                            value={form.phone}
                            onChange={e => setForm(s => ({ ...s, phone: e.target.value }))}
                        />
                    </FieldGroup>
                    <FieldGroup label="Email">
                        <input
                            type="email"
                            className="form-input"
                            value={form.email}
                            onChange={e => setForm(s => ({ ...s, email: e.target.value }))}
                        />
                    </FieldGroup>
                </div>
                <FieldGroup label="Website">
                    <input
                        className="form-input"
                        placeholder="https://..."
                        value={form.website}
                        onChange={e => setForm(s => ({ ...s, website: e.target.value }))}
                    />
                </FieldGroup>
                <div className="pt-1">
                    <SaveButton loading={loading} />
                </div>
            </form>
        </div>
    );
}

// ─── User Modal ───────────────────────────────────────────────────────────────

function UserModal({ user, onClose, onSaved }) {
    const { showToast } = useToast();
    const isEdit = !!user;
    const [form, setForm] = useState({
        full_name: user?.full_name || '',
        username: user?.username || '',
        email: user?.email || '',
        password: '',
        role: user?.role || 'dentist',
    });
    const [loading, setLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEdit) {
                const res = await client.put(`/settings/users/${user.id}`, {
                    full_name: form.full_name,
                    email: form.email,
                    role: form.role,
                });
                onSaved(res.data, 'update');
            } else {
                const res = await client.post('/settings/users', form);
                onSaved(res.data, 'create');
            }
            onClose();
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to save user', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            >
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-semibold text-lg text-text-primary">
                        {isEdit ? 'Edit Staff Member' : 'Add Staff Member'}
                    </h2>
                    <button onClick={onClose} className="btn-icon">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <FieldGroup label="Full Name">
                        <input
                            className="form-input"
                            value={form.full_name}
                            onChange={e => setForm(s => ({ ...s, full_name: e.target.value }))}
                            required
                        />
                    </FieldGroup>
                    {!isEdit && (
                        <FieldGroup label="Username">
                            <input
                                className="form-input"
                                value={form.username}
                                onChange={e => setForm(s => ({ ...s, username: e.target.value }))}
                                required
                                minLength={3}
                            />
                        </FieldGroup>
                    )}
                    <FieldGroup label="Email">
                        <input
                            type="email"
                            className="form-input"
                            value={form.email}
                            onChange={e => setForm(s => ({ ...s, email: e.target.value }))}
                            required
                        />
                    </FieldGroup>
                    {!isEdit && (
                        <FieldGroup label="Password">
                            <div className="relative">
                                <input
                                    type={showPwd ? 'text' : 'password'}
                                    className="form-input pr-10"
                                    value={form.password}
                                    onChange={e => setForm(s => ({ ...s, password: e.target.value }))}
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPwd(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                                >
                                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </FieldGroup>
                    )}
                    <FieldGroup label="Role">
                        <select
                            className="form-input"
                            value={form.role}
                            onChange={e => setForm(s => ({ ...s, role: e.target.value }))}
                        >
                            {ROLES.map(r => (
                                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                            ))}
                        </select>
                    </FieldGroup>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
                        <button type="submit" disabled={loading} className="btn-primary flex-1">
                            {loading ? 'Saving…' : (isEdit ? 'Save Changes' : 'Add Staff')}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab() {
    const { admin } = useAuth();
    const { showToast } = useToast();
    const isAdmin = admin?.role === 'admin';

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null); // null | 'add' | user object

    useEffect(() => {
        (async () => {
            try {
                const res = await client.get('/settings/users');
                setUsers(res.data);
            } catch {
                showToast('Failed to load users', 'error');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleSaved = (saved, type) => {
        if (type === 'create') {
            setUsers(u => [...u, saved]);
            showToast('Staff member added', 'success');
        } else {
            setUsers(u => u.map(x => x.id === saved.id ? { ...x, ...saved } : x));
            showToast('Staff member updated', 'success');
        }
    };

    const handleToggleStatus = async (user) => {
        try {
            const res = await client.patch(`/settings/users/${user.id}/status`);
            setUsers(u => u.map(x => x.id === user.id ? { ...x, is_active: res.data.is_active } : x));
            showToast(`${user.full_name} ${res.data.is_active ? 'activated' : 'deactivated'}`, 'success');
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to update status', 'error');
        }
    };

    const roleBadgeColor = {
        admin: 'bg-purple-100 text-purple-700',
        dentist: 'bg-blue-100 text-blue-700',
        hygienist: 'bg-teal-100 text-teal-700',
        receptionist: 'bg-amber-100 text-amber-700',
    };

    return (
        <>
            <div className="card p-0 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-text-secondary" />
                        <span className="font-semibold text-text-primary">Staff Members</span>
                        <span className="text-text-secondary text-sm">({users.length})</span>
                    </div>
                    {isAdmin && (
                        <button onClick={() => setModal('add')} className="btn-primary text-sm">
                            <Plus className="w-4 h-4" /> Add Staff
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-bg/80 border-b border-border">
                            <tr>
                                {['Name', 'Username', 'Role', 'Status', 'Last Login', ...(isAdmin ? ['Actions'] : [])].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="border-b border-border/50">
                                        {[1, 2, 3, 4, 5, 6].map(j => (
                                            <td key={j} className="px-4 py-3">
                                                <div className="skeleton h-4 rounded w-3/4" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : users.map(u => (
                                <tr key={u.id} className="border-b border-border/50 hover:bg-bg/40 transition-colors">
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                                {u.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-text-primary">{u.full_name}</span>
                                            {u.id === admin?.id && (
                                                <span className="text-xs text-text-secondary">(you)</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-text-secondary">{u.username}</td>
                                    <td className="px-4 py-3.5">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeColor[u.role] || 'bg-gray-100 text-gray-700'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'badge-green' : 'bg-gray-100 text-gray-500'}`}>
                                            {u.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5 text-text-secondary">
                                        {u.last_login ? formatDate(u.last_login) : 'Never'}
                                    </td>
                                    {isAdmin && (
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => setModal(u)}
                                                    className="btn-icon"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                {u.id !== admin?.id && (
                                                    <button
                                                        onClick={() => handleToggleStatus(u)}
                                                        className="btn-icon"
                                                        title={u.is_active ? 'Deactivate' : 'Activate'}
                                                    >
                                                        {u.is_active
                                                            ? <ToggleRight className="w-4 h-4 text-primary" />
                                                            : <ToggleLeft className="w-4 h-4 text-text-secondary" />
                                                        }
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {modal && (
                    <UserModal
                        user={modal === 'add' ? null : modal}
                        onClose={() => setModal(null)}
                        onSaved={handleSaved}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Settings() {
    const [activeTab, setActiveTab] = useState('account');

    return (
        <div className="space-y-6 animate-fade-up">
            <div>
                <h1 className="font-display text-2xl font-bold text-text-primary">Settings</h1>
                <p className="text-text-secondary text-sm">Manage your account, clinic info, and staff</p>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-bg border border-border rounded-xl p-1 w-fit">
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === tab.key
                                ? 'bg-white text-text-primary shadow-sm'
                                : 'text-text-secondary hover:text-text-primary'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
                <motion.div key={activeTab} {...fadeUp}>
                    {activeTab === 'account' && <AccountTab />}
                    {activeTab === 'clinic' && <ClinicTab />}
                    {activeTab === 'users' && <UsersTab />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
