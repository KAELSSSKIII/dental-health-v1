import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, User, Ban, Tablet } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const api = axios.create({ baseURL: API_BASE });

const todayLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const EMPTY = {
    last_name: '', first_name: '', middle_name: '',
    date_of_birth: '', sex: '',
    phone: '', email: '', address: '', zip_code: '',
    occupation: '', marital_status: '', spouse_name: '',
    insurance_provider: '', insurance_id: '',
    referred_by: '',
};

function Field({ label, required, error, children }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
    );
}

function inputCls(err) {
    return `w-full px-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/40 transition bg-white ${err ? 'border-red-400' : 'border-border'}`;
}

export default function Kiosk() {
    const { token } = useParams();
    const [pageState, setPageState] = useState('checking'); // checking | welcome | form | success | invalid
    const [clinicName, setClinicName] = useState('Our Clinic');
    const [patientName, setPatientName] = useState('');
    const [wasUpdated, setWasUpdated] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [countdown, setCountdown] = useState(15);

    useEffect(() => {
        api.get(`/kiosk/validate/${token}`)
            .then(res => {
                setClinicName(res.data.clinic_name || 'Our Clinic');
                setPageState('welcome');
            })
            .catch(() => setPageState('invalid'));
    }, [token]);

    useEffect(() => {
        if (pageState !== 'success') return;
        setCountdown(15);
        const iv = setInterval(() => {
            setCountdown(c => {
                if (c <= 1) { clearInterval(iv); resetKiosk(); return 0; }
                return c - 1;
            });
        }, 1000);
        return () => clearInterval(iv);
    }, [pageState]);

    const resetKiosk = () => {
        setForm(EMPTY);
        setErrors({});
        setPatientName('');
        setWasUpdated(false);
        setPageState('welcome');
        window.scrollTo({ top: 0 });
    };

    const set = field => e => setForm(s => ({ ...s, [field]: e.target.value }));

    const validate = () => {
        const errs = {};
        if (!form.last_name.trim()) errs.last_name = 'Required';
        if (!form.first_name.trim()) errs.first_name = 'Required';
        if (!form.date_of_birth) errs.date_of_birth = 'Required';
        else {
            const yr = new Date().getFullYear() - new Date(form.date_of_birth).getFullYear();
            if (yr < 0 || yr > 120) errs.date_of_birth = 'Invalid date';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async e => {
        e.preventDefault();
        if (!validate()) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
        setSaving(true);
        try {
            const res = await api.post(`/kiosk/${token}`, { ...form, record_date: todayLocal() });
            setPatientName(res.data.patientName || form.first_name);
            setWasUpdated(res.data.updated === true);
            setPageState('success');
            window.scrollTo({ top: 0 });
        } catch (err) {
            alert(err.response?.data?.error || 'Something went wrong. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (pageState === 'checking') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (pageState === 'invalid') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg px-6">
                <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                        <Ban className="w-12 h-12 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-text-primary mb-2">Invalid Kiosk Link</h1>
                    <p className="text-text-secondary text-lg">Please ask clinic staff for the correct kiosk URL.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-bg to-bg">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white border-b border-border shadow-sm px-6 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Tablet className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <p className="font-bold text-text-primary text-lg leading-tight">{clinicName}</p>
                    <p className="text-xs text-text-secondary">Patient Registration Kiosk</p>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-8">
                <AnimatePresence mode="wait">

                    {/* Welcome */}
                    {pageState === 'welcome' && (
                        <motion.div key="welcome"
                            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                            className="text-center py-20">
                            <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-8">
                                <User className="w-14 h-14 text-primary" />
                            </div>
                            <h1 className="text-4xl font-bold text-text-primary mb-4">Welcome!</h1>
                            <p className="text-text-secondary text-xl mb-12">
                                New patient? Please fill in your details to get started.
                            </p>
                            <button
                                onClick={() => setPageState('form')}
                                className="btn-primary text-xl px-14 py-5 rounded-2xl shadow-lg">
                                Start Registration
                            </button>
                        </motion.div>
                    )}

                    {/* Form */}
                    {pageState === 'form' && (
                        <motion.form key="form"
                            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            onSubmit={handleSubmit}
                            className="space-y-6">

                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-text-primary">New Patient Registration</h2>
                                <p className="text-text-secondary text-sm mt-1">Fields marked * are required</p>
                            </div>

                            {/* Personal Info */}
                            <div className="card space-y-5">
                                <h3 className="font-semibold text-text-primary border-b border-border pb-3">Personal Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Last Name" required error={errors.last_name}>
                                        <input className={inputCls(errors.last_name)} value={form.last_name} onChange={set('last_name')} autoCapitalize="words" />
                                    </Field>
                                    <Field label="First Name" required error={errors.first_name}>
                                        <input className={inputCls(errors.first_name)} value={form.first_name} onChange={set('first_name')} autoCapitalize="words" />
                                    </Field>
                                </div>
                                <Field label="Middle Name">
                                    <input className={inputCls(false)} value={form.middle_name} onChange={set('middle_name')} autoCapitalize="words" />
                                </Field>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Date of Birth" required error={errors.date_of_birth}>
                                        <input type="date" className={inputCls(errors.date_of_birth)} value={form.date_of_birth} onChange={set('date_of_birth')} max={todayLocal()} />
                                    </Field>
                                    <Field label="Sex">
                                        <select className={inputCls(false)} value={form.sex} onChange={set('sex')}>
                                            <option value="">Select</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </Field>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Civil Status">
                                        <select className={inputCls(false)} value={form.marital_status} onChange={set('marital_status')}>
                                            <option value="">Select</option>
                                            <option value="single">Single</option>
                                            <option value="married">Married</option>
                                            <option value="widowed">Widowed</option>
                                            <option value="divorced">Divorced</option>
                                        </select>
                                    </Field>
                                    <Field label="Occupation">
                                        <input className={inputCls(false)} value={form.occupation} onChange={set('occupation')} autoCapitalize="words" />
                                    </Field>
                                </div>
                                {form.marital_status === 'married' && (
                                    <Field label="Spouse Name">
                                        <input className={inputCls(false)} value={form.spouse_name} onChange={set('spouse_name')} autoCapitalize="words" />
                                    </Field>
                                )}
                            </div>

                            {/* Contact */}
                            <div className="card space-y-5">
                                <h3 className="font-semibold text-text-primary border-b border-border pb-3">Contact Information</h3>
                                <Field label="Phone / Mobile">
                                    <input type="tel" className={inputCls(false)} value={form.phone} onChange={set('phone')} />
                                </Field>
                                <Field label="Email Address">
                                    <input type="email" className={inputCls(false)} value={form.email} onChange={set('email')} autoCapitalize="none" inputMode="email" />
                                </Field>
                                <Field label="Home Address">
                                    <textarea className={`${inputCls(false)} resize-none`} rows={2} value={form.address} onChange={set('address')} />
                                </Field>
                            </div>

                            {/* Insurance */}
                            <div className="card space-y-5">
                                <h3 className="font-semibold text-text-primary border-b border-border pb-3">Insurance & Referral <span className="text-xs font-normal text-text-secondary">(optional)</span></h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Insurance Provider">
                                        <input className={inputCls(false)} value={form.insurance_provider} onChange={set('insurance_provider')} />
                                    </Field>
                                    <Field label="Insurance ID">
                                        <input className={inputCls(false)} value={form.insurance_id} onChange={set('insurance_id')} />
                                    </Field>
                                </div>
                                <Field label="How did you hear about us?">
                                    <input className={inputCls(false)} placeholder="e.g. Friend, Facebook, Dr. Santos…" value={form.referred_by} onChange={set('referred_by')} />
                                </Field>
                            </div>

                            <div className="flex gap-4 pb-8">
                                <button type="button" onClick={resetKiosk} className="btn-ghost flex-1 py-4 text-base rounded-xl">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="btn-primary flex-[2] py-4 text-base rounded-xl">
                                    {saving ? 'Submitting…' : 'Submit Registration'}
                                </button>
                            </div>
                        </motion.form>
                    )}

                    {/* Success */}
                    {pageState === 'success' && (
                        <motion.div key="success"
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                            className="text-center py-20">
                            <div className={`w-28 h-28 rounded-full ${wasUpdated ? 'bg-blue-100' : 'bg-green-100'} flex items-center justify-center mx-auto mb-8`}>
                                <CheckCircle className={`w-16 h-16 ${wasUpdated ? 'text-blue-500' : 'text-green-500'}`} />
                            </div>
                            <h1 className="text-4xl font-bold text-text-primary mb-4">
                                {wasUpdated ? 'Welcome Back!' : 'Registration Complete!'}
                            </h1>
                            <p className="text-2xl text-text-secondary mb-3">
                                Thank you, <strong className="text-text-primary">{patientName}</strong>!
                            </p>
                            <p className="text-text-secondary text-lg mb-2">
                                {wasUpdated
                                    ? 'Your information has been updated. Please take a seat.'
                                    : 'Your registration is submitted. Please take a seat.'}
                            </p>
                            <p className="text-xl font-semibold text-text-primary mt-6 mb-2">
                                Staff will be with you shortly.
                            </p>
                            <p className="text-text-secondary mb-10">Resetting in {countdown} seconds…</p>
                            <button onClick={resetKiosk} className="btn-primary text-lg px-12 py-4 rounded-2xl">
                                Next Patient
                            </button>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
}
