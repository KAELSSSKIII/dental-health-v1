import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Lock, Eye, EyeOff, MapPin, Phone, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Login() {
    const [form, setForm] = useState({ username: '', password: '', remember: false });
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, admin } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (admin) navigate('/dashboard', { replace: true });
    }, [admin, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.username || !form.password) { setError('Please enter username and password.'); return; }
        setLoading(true); setError('');
        try {
            await login(form.username, form.password);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left panel */}
            <motion.div
                className="hidden lg:flex lg:w-1/2 xl:w-5/12 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #051f19 0%, #0a6352 50%, #0d8a6e 100%)' }}
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
            >
                {/* Decorative circles */}
                <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/5" />
                <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-white/5" />
                <div className="absolute top-1/3 right-8 w-32 h-32 rounded-full bg-white/5" />

                {/* Tooth pattern SVG */}
                <svg className="absolute inset-0 w-full h-full opacity-5" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice">
                    {[0, 1, 2, 3, 4, 5].map(i => (
                        <g key={i} transform={`translate(${(i % 3) * 140 + 20}, ${Math.floor(i / 3) * 200 + 40})`}>
                            <path d="M40 0 C60 0 80 20 80 50 C80 80 70 100 60 120 C55 135 50 145 40 145 C30 145 25 135 20 120 C10 100 0 80 0 50 C0 20 20 0 40 0 Z" fill="white" />
                        </g>
                    ))}
                </svg>

                <div className="relative flex flex-col items-center justify-center w-full px-10 text-white">
                    <motion.img
                        src="/logo.png"
                        alt="Clinic Logo"
                        className="w-64 h-auto object-contain mb-6"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                    />
                    <motion.p
                        className="text-white/70 text-center mb-8 text-sm"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                    >
                        Dental Clinic Management System
                    </motion.p>
                    <motion.div
                        className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 w-full max-w-xs border border-white/20"
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                    >
                        <p className="font-semibold text-sm mb-3 text-white/90">Plaza Maestro Clinic</p>
                        <div className="flex items-start gap-2 text-sm text-white/70 mb-2">
                            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-white/60" />
                            <span>Plaza Maestro Annex, Burgos St., Vigan City, Ilocos Sur</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/70">
                            <Phone className="w-4 h-4 shrink-0 text-white/60" />
                            <span>Tel. 722-2420</span>
                        </div>
                    </motion.div>
                </div>
            </motion.div>

            {/* Right panel */}
            <motion.div
                className="flex-1 flex items-center justify-center bg-white p-8"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
            >
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <img src="/logo.png" alt="Clinic Logo" className="w-10 h-10 rounded-xl object-contain" />
                        <div>
                            <p className="font-semibold text-text-primary">Dental Health Records</p>
                            <p className="text-xs text-text-secondary">Plaza Maestro Clinic</p>
                        </div>
                    </div>

                    <h2 className="font-display text-3xl font-bold text-text-primary mb-1">Welcome Back</h2>
                    <p className="text-text-secondary text-sm mb-8">Sign in to your clinic account</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username */}
                        <div>
                            <label className="form-label">Username</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                                <input
                                    id="username"
                                    type="text"
                                    placeholder="Enter your username"
                                    className="form-input pl-10"
                                    value={form.username}
                                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="form-label">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                                <input
                                    id="password"
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="Enter your password"
                                    className="form-input pl-10 pr-10"
                                    value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                                    onClick={() => setShowPass(!showPass)}
                                >
                                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Remember me */}
                        <div className="flex items-center gap-2">
                            <input
                                id="remember"
                                type="checkbox"
                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30"
                                checked={form.remember}
                                onChange={e => setForm(f => ({ ...f, remember: e.target.checked }))}
                            />
                            <label htmlFor="remember" className="text-sm text-text-secondary cursor-pointer">
                                Remember me
                            </label>
                        </div>

                        {/* Error */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                            >
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </motion.div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full justify-center py-3 text-base"
                        >
                            {loading ? <><LoadingSpinner size="sm" /> Signing in...</> : 'Sign In'}
                        </button>
                    </form>

                    <p className="text-center text-xs text-text-secondary mt-8">
                        © 2026 Plaza Maestro Dental Clinic · Vigan City, Ilocos Sur
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
