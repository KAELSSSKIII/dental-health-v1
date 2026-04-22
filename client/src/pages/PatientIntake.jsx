import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle, MapPin, User, Shield, Briefcase, Camera,
    Upload, RefreshCw, X, Ban, AlertCircle,
} from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const api = axios.create({ baseURL: API_BASE });

function getDeviceId() {
    try {
        let id = localStorage.getItem('_did');
        if (!id) {
            id = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
            localStorage.setItem('_did', id);
        }
        return id;
    } catch {
        return '';
    }
}

const todayLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

function resizeImage(dataUrl, maxPx = 800) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * ratio);
            canvas.height = Math.round(img.height * ratio);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = dataUrl;
    });
}

const Section = ({ title, icon: Icon, children }) => (
    <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Icon className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">{title}</h3>
        </div>
        {children}
    </div>
);

const Field = ({ label, required, error, children }) => (
    <div>
        <label className="form-label">
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {children}
        {error && <p className="form-error">{error}</p>}
    </div>
);

function StatusScreen({ icon: Icon, iconBg, iconColor, title, subtitle, note }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card text-center py-14 px-6"
        >
            <div className={`w-20 h-20 rounded-full ${iconBg} flex items-center justify-center mx-auto mb-5`}>
                <Icon className={`w-10 h-10 ${iconColor}`} />
            </div>
            <h2 className="font-display text-2xl font-bold text-text-primary mb-2">{title}</h2>
            <p className="text-text-secondary text-base mb-6">{subtitle}</p>
            {note && (
                <div className="inline-flex items-center gap-2 bg-surface text-text-secondary font-medium text-sm px-5 py-3 rounded-xl">
                    {note}
                </div>
            )}
            <p className="text-xs text-text-secondary mt-8">
                © {new Date().getFullYear()} Plaza Maestro Dental Clinic
            </p>
        </motion.div>
    );
}

export default function PatientIntake() {
    const { slug } = useParams();

    // page states: checking | not_found | disabled | form | success
    const [pageState, setPageState] = useState('checking');
    const [redirectUrl, setRedirectUrl] = useState(null);
    const [patientName, setPatientName] = useState('');
    const [wasUpdated, setWasUpdated] = useState(false);
    const [formStartTime] = useState(() => Date.now());
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const fileInputRef = useRef(null);
    const [cameraOpen, setCameraOpen] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [profilePhoto, setProfilePhoto] = useState(null);

    const [form, setForm] = useState({
        last_name: '', first_name: '', middle_name: '', date_of_birth: '',
        sex: '', height: '', weight: '', occupation: '', marital_status: '',
        spouse_name: '', address: '', zip_code: '', phone: '', business_address: '',
        business_phone: '', email: '', referred_by: '', preferred_appointment_time: '',
        insurance_provider: '', insurance_id: '', notes: '',
        record_date: todayLocal(),
    });

    const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

    // Validate slug on mount
    useEffect(() => {
        if (!slug) { setPageState('not_found'); return; }
        api.get(`/intake/status/${slug}`)
            .then(res => {
                setRedirectUrl(res.data.redirect_url || null);
                setPageState('form');
            })
            .catch(err => {
                if (err.response?.status === 403) setPageState('disabled');
                else setPageState('not_found');
            });
    }, [slug]);

    // Auto-redirect after success
    useEffect(() => {
        if (pageState === 'success' && redirectUrl) {
            const t = setTimeout(() => { window.location.href = redirectUrl; }, 2500);
            return () => clearTimeout(t);
        }
    }, [pageState, redirectUrl]);

    // ── Camera ────────────────────────────────────────────────────────────────

    const openCamera = async () => {
        setCameraError('');
        setCameraOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
            });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            setCameraError(
                err.name === 'NotAllowedError'
                    ? 'Camera access denied. Please allow camera permission or upload a photo instead.'
                    : 'Could not access camera. Please upload a photo instead.'
            );
        }
    };

    const stopCamera = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    };

    const capturePhoto = async () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const size = Math.min(video.videoWidth, video.videoHeight);
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        canvas.getContext('2d').drawImage(
            video, (video.videoWidth - size) / 2, (video.videoHeight - size) / 2,
            size, size, 0, 0, size, size
        );
        stopCamera();
        setCameraOpen(false);
        const compressed = await resizeImage(canvas.toDataURL('image/jpeg', 0.9), 800);
        setProfilePhoto(compressed);
        setErrors(e => ({ ...e, profile_photo: undefined }));
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const compressed = await resizeImage(ev.target.result, 800);
            setProfilePhoto(compressed);
            setErrors(e => ({ ...e, profile_photo: undefined }));
        };
        reader.readAsDataURL(file);
    };

    // ── Validate + Submit ─────────────────────────────────────────────────────

    const validate = () => {
        const errs = {};
        if (!form.last_name.trim()) errs.last_name = 'Last name is required';
        if (!form.first_name.trim()) errs.first_name = 'First name is required';
        if (!form.date_of_birth) errs.date_of_birth = 'Date of birth is required';
        if (!profilePhoto) errs.profile_photo = 'Patient photo is required';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
        setSaving(true);
        try {
            const res = await api.post('/patients/intake', {
                ...form,
                profile_photo: profilePhoto,
                _t: Date.now() - formStartTime,
                _did: getDeviceId(),
                fax: '',
            });
            setPatientName(res.data.patientName || form.first_name);
            setWasUpdated(res.data.updated === true);
            setPageState('success');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            const apiErrors = err.response?.data?.errors;
            if (apiErrors) {
                const mapped = {};
                apiErrors.forEach(e => { mapped[e.path] = e.msg; });
                setErrors(mapped);
            } else {
                setErrors({ _global: err.response?.data?.error || 'Something went wrong. Please try again.' });
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg">
            {/* Header */}
            <div
                style={{ background: 'linear-gradient(135deg, #051f19 0%, #0a6352 60%, #0d8a6e 100%)' }}
                className="px-4 py-5 text-white shadow-lg sticky top-0 z-10"
            >
                <div className="max-w-3xl mx-auto flex items-center gap-3 sm:gap-4 min-w-0">
                    <img src="/logo.png" alt="Clinic Logo" className="h-10 w-auto object-contain shrink-0" />
                    <p className="text-white/70 text-sm truncate">New Patient Registration Form</p>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-6">
                <AnimatePresence mode="wait">

                    {pageState === 'checking' && (
                        <motion.div key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="flex items-center justify-center py-32">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </motion.div>
                    )}

                    {pageState === 'not_found' && (
                        <motion.div key="not_found" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                            <StatusScreen
                                icon={AlertCircle} iconBg="bg-gray-100" iconColor="text-gray-400"
                                title="Form Not Found"
                                subtitle="This registration form link is invalid or no longer available."
                                note="Please contact clinic staff for a valid link."
                            />
                        </motion.div>
                    )}

                    {pageState === 'disabled' && (
                        <motion.div key="disabled" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                            <StatusScreen
                                icon={Ban} iconBg="bg-amber-50" iconColor="text-amber-500"
                                title="Registration Unavailable"
                                subtitle="The new patient registration form is currently closed."
                                note="Please check back later or contact staff directly."
                            />
                        </motion.div>
                    )}

                    {pageState === 'success' && (
                        <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            className="card text-center py-14 px-6">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5
                                            ${wasUpdated ? 'bg-blue-100' : 'bg-green-100'}`}>
                                <CheckCircle className={`w-10 h-10 ${wasUpdated ? 'text-blue-600' : 'text-green-600'}`} />
                            </div>
                            <h2 className="font-display text-2xl font-bold text-text-primary mb-2">
                                {wasUpdated ? `Welcome back, ${patientName}!` : `Thank you, ${patientName}!`}
                            </h2>
                            <p className="text-text-secondary text-base mb-6">
                                {wasUpdated
                                    ? 'We found your existing record. Your contact information has been updated successfully.'
                                    : 'Your information has been received successfully.'}
                            </p>
                            {redirectUrl
                                ? <p className="text-sm text-text-secondary">Redirecting you shortly…</p>
                                : <div className={`inline-flex items-center gap-2 font-semibold text-sm px-5 py-3 rounded-xl
                                                  ${wasUpdated ? 'bg-blue-50 text-blue-700' : 'bg-primary/10 text-primary'}`}>
                                   
                                </div>
                            }
                            <p className="text-xs text-text-secondary mt-8">
                                © {new Date().getFullYear()} Plaza Maestro Dental Clinic
                            </p>
                        </motion.div>
                    )}

                    {pageState === 'form' && (
                        <motion.form key="form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                            onSubmit={handleSubmit} className="space-y-5">

                            {/* Anti-spam honeypot — invisible to humans, filled only by bots */}
                            <div style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }}
                                 aria-hidden="true">
                                <input name="fax" type="text" tabIndex={-1} autoComplete="off"
                                       value="" onChange={() => {}} />
                            </div>

                            <div className="card bg-primary/5 border border-primary/20">
                                <p className="text-sm text-text-primary">
                                    Welcome! Please fill in your information below. Fields marked with
                                    <span className="text-red-500 font-bold mx-1">*</span> are required.
                                </p>
                            </div>

                            {errors._global && (
                                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    {errors._global}
                                </div>
                            )}

                            {/* Personal Information */}
                            <div className="card space-y-5">
                                <Section title="Personal Information" icon={User}>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <Field label="Last Name" required error={errors.last_name}>
                                            <input className="form-input" value={form.last_name} onChange={set('last_name')} placeholder="Dela Cruz" />
                                        </Field>
                                        <Field label="First Name" required error={errors.first_name}>
                                            <input className="form-input" value={form.first_name} onChange={set('first_name')} placeholder="Juan" />
                                        </Field>
                                        <Field label="Middle Name">
                                            <input className="form-input" value={form.middle_name} onChange={set('middle_name')} placeholder="Reyes" />
                                        </Field>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Field label="Date of Birth" required error={errors.date_of_birth}>
                                            <input type="date" className="form-input" value={form.date_of_birth} onChange={set('date_of_birth')} />
                                        </Field>
                                        <Field label="Sex">
                                            <select className="form-select" value={form.sex} onChange={set('sex')}>
                                                <option value="">Select</option>
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </Field>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                        <Field label="Height">
                                            <input className="form-input" value={form.height} onChange={set('height')} placeholder="170 cm" />
                                        </Field>
                                        <Field label="Weight">
                                            <input className="form-input" value={form.weight} onChange={set('weight')} placeholder="65 kg" />
                                        </Field>
                                        <div className="sm:col-span-2">
                                            <Field label="Occupation">
                                                <input className="form-input" value={form.occupation} onChange={set('occupation')} placeholder="Engineer" />
                                            </Field>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="form-label">Marital Status</label>
                                        <div className="flex flex-wrap gap-4 mt-1">
                                            {['single', 'married', 'widowed', 'divorced'].map(ms => (
                                                <label key={ms} className="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" name="marital_status" value={ms}
                                                        checked={form.marital_status === ms} onChange={set('marital_status')}
                                                        className="text-primary focus:ring-primary/30" />
                                                    <span className="text-sm capitalize text-text-primary">{ms}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Field label="Spouse Name">
                                            <input className="form-input" value={form.spouse_name} onChange={set('spouse_name')} />
                                        </Field>
                                        <Field label="Referred By">
                                            <input className="form-input" value={form.referred_by} onChange={set('referred_by')} placeholder="Dr. Santos / Walk-in" />
                                        </Field>
                                    </div>
                                    <Field label="Preferred Appointment Time">
                                        <input className="form-input" value={form.preferred_appointment_time} onChange={set('preferred_appointment_time')} placeholder="Morning, 9–11 AM" />
                                    </Field>
                                </Section>
                            </div>

                            {/* Contact */}
                            <div className="card space-y-5">
                                <Section title="Contact Information" icon={MapPin}>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                        <div className="sm:col-span-3">
                                            <Field label="Home Address">
                                                <textarea className="form-textarea" rows={2} value={form.address} onChange={set('address')} placeholder="123 Burgos St., Vigan City" />
                                            </Field>
                                        </div>
                                        <Field label="ZIP Code">
                                            <input className="form-input" value={form.zip_code} onChange={set('zip_code')} placeholder="2700" />
                                        </Field>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <Field label="Phone Number">
                                            <input className="form-input" value={form.phone} onChange={set('phone')} placeholder="09171234567" />
                                        </Field>
                                        <Field label="Email Address">
                                            <input type="email" className="form-input" value={form.email} onChange={set('email')} placeholder="email@example.com" />
                                        </Field>
                                        <Field label="Business Phone">
                                            <input className="form-input" value={form.business_phone} onChange={set('business_phone')} />
                                        </Field>
                                    </div>
                                    <Field label="Business Address">
                                        <textarea className="form-textarea" rows={2} value={form.business_address} onChange={set('business_address')} />
                                    </Field>
                                </Section>
                            </div>

                            {/* Insurance */}
                            <div className="card space-y-5">
                                <Section title="Insurance Information" icon={Shield}>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Field label="Insurance Provider">
                                            <input className="form-input" value={form.insurance_provider} onChange={set('insurance_provider')} placeholder="PhilHealth" />
                                        </Field>
                                        <Field label="Insurance / Member ID">
                                            <input className="form-input" value={form.insurance_id} onChange={set('insurance_id')} placeholder="PH-12345678" />
                                        </Field>
                                    </div>
                                </Section>
                            </div>

                            {/* Notes */}
                            <div className="card space-y-4">
                                <Section title="Additional Notes" icon={Briefcase}>
                                    <Field label="Anything else you'd like us to know?">
                                        <textarea className="form-textarea" rows={3} value={form.notes} onChange={set('notes')} placeholder="Allergies, concerns, special requests..." />
                                    </Field>
                                </Section>
                            </div>

                            {/* Photo */}
                            <div className="card space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-border">
                                    <Camera className="w-4 h-4 text-primary" />
                                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Patient Photo</h3>
                                    <span className="text-red-500 ml-0.5 text-sm font-bold">*</span>
                                </div>
                                {profilePhoto ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <img src={profilePhoto} alt="Patient photo"
                                            className="w-40 h-40 rounded-2xl object-cover border-4 border-primary/20 shadow-md" />
                                        <button type="button"
                                            className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
                                            onClick={() => { setProfilePhoto(null); openCamera(); }}>
                                            <RefreshCw className="w-4 h-4" /> Retake Photo
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-4 py-4">
                                        <div className={`w-36 h-36 rounded-2xl border-2 border-dashed flex items-center justify-center bg-surface
                                            ${errors.profile_photo ? 'border-red-400 bg-red-50' : 'border-border'}`}>
                                            <Camera className={`w-10 h-10 ${errors.profile_photo ? 'text-red-400' : 'text-text-secondary opacity-40'}`} />
                                        </div>
                                        {errors.profile_photo && (
                                            <p className="text-sm text-red-500 font-medium">{errors.profile_photo}</p>
                                        )}
                                        <p className="text-sm text-text-secondary text-center">
                                            Please take a clear photo of your face for your patient record.
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                            <button type="button" className="btn-primary w-full sm:w-auto" onClick={openCamera}>
                                                <Camera className="w-4 h-4" /> Open Camera
                                            </button>
                                            <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => fileInputRef.current?.click()}>
                                                <Upload className="w-4 h-4" /> Upload Photo
                                            </button>
                                        </div>
                                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                                    </div>
                                )}
                            </div>

                            {/* Submit */}
                            <div className="card">
                                <p className="text-xs text-text-secondary mb-4">
                                    By submitting this form, you authorize Plaza Maestro Dental Clinic to use this information for your dental treatment and care.
                                </p>
                                <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-3 text-base">
                                    {saving ? 'Submitting…' : 'Submit My Information'}
                                </button>
                            </div>

                            <p className="text-center text-xs text-text-secondary pb-4">
                                © {new Date().getFullYear()} Plaza Maestro Dental Clinic
                            </p>
                        </motion.form>
                    )}

                </AnimatePresence>
            </div>

            {/* Camera modal */}
            {cameraOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                            <h3 className="font-semibold text-text-primary">Take Your Photo</h3>
                            <button type="button" className="p-1 rounded-lg hover:bg-surface transition-colors"
                                onClick={() => { stopCamera(); setCameraOpen(false); setCameraError(''); }}>
                                <X className="w-5 h-5 text-text-secondary" />
                            </button>
                        </div>
                        <div className="p-5">
                            {cameraError ? (
                                <div className="text-center py-6 space-y-4">
                                    <p className="text-sm text-red-500">{cameraError}</p>
                                    <button type="button" className="btn-secondary"
                                        onClick={() => { setCameraOpen(false); setCameraError(''); fileInputRef.current?.click(); }}>
                                        <Upload className="w-4 h-4" /> Upload a Photo Instead
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-text-secondary mb-3 text-center">
                                        Position your face in the center and tap Capture.
                                    </p>
                                    <video ref={videoRef} autoPlay playsInline muted
                                        className="w-full aspect-square rounded-xl bg-black object-cover" />
                                    <button type="button" className="btn-primary w-full justify-center mt-4" onClick={capturePhoto}>
                                        <Camera className="w-4 h-4" /> Capture Photo
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
