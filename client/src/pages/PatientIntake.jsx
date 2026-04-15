import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, MapPin, User, Shield, Briefcase, Camera, Upload, RefreshCw, X } from 'lucide-react';
import axios from 'axios';

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

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api' });

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
        <label className="form-label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
        {children}
        {error && <p className="form-error">{error}</p>}
    </div>
);

export default function PatientIntake() {
    const [submitted, setSubmitted] = useState(false);
    const [patientName, setPatientName] = useState('');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    // Camera state
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
        record_date: new Date().toISOString().slice(0, 10),
    });

    const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

    // ── Camera helpers ────────────────────────────────────────
    const openCamera = async () => {
        setCameraError('');
        setCameraOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            setCameraError(
                err.name === 'NotAllowedError'
                    ? 'Camera access denied. Please allow camera permission or upload a photo instead.'
                    : 'Could not access camera. Please upload a photo instead.'
            );
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    };

    const capturePhoto = async () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const size = Math.min(video.videoWidth, video.videoHeight);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video,
            (video.videoWidth - size) / 2, (video.videoHeight - size) / 2,
            size, size, 0, 0, size, size
        );
        const raw = canvas.toDataURL('image/jpeg', 0.9);
        stopCamera();
        setCameraOpen(false);
        const compressed = await resizeImage(raw, 800);
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
        if (!validate()) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        setSaving(true);
        try {
            await api.post('/patients/intake', { ...form, profile_photo: profilePhoto });
            setPatientName(form.first_name);
            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            const apiErrors = err.response?.data?.errors;
            if (apiErrors) {
                const mapped = {};
                apiErrors.forEach(e => { mapped[e.path] = e.msg; });
                setErrors(mapped);
            } else {
                setErrors({ _global: 'Something went wrong. Please try again.' });
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg">
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #051f19 0%, #0a6352 60%, #0d8a6e 100%)' }}
                className="px-4 py-5 text-white shadow-lg sticky top-0 z-10">
                <div className="max-w-3xl mx-auto flex items-center gap-4">
                    <img src="/logo.png" alt="Clinic Logo" className="h-10 w-auto object-contain shrink-0" />
                    <p className="text-white/70 text-sm">Patient Health Record Form</p>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-6">
                <AnimatePresence mode="wait">

                    {/* ── Success Screen ── */}
                    {submitted ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="card text-center py-14 px-6"
                        >
                            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h2 className="font-display text-2xl font-bold text-text-primary mb-2">
                                Thank you, {patientName}!
                            </h2>
                            <p className="text-text-secondary text-base mb-6">
                                Your information has been received successfully.
                            </p>
                            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary font-semibold text-sm px-5 py-3 rounded-xl">
                                Please hand the tablet back to our staff.
                            </div>
                            <p className="text-xs text-text-secondary mt-8">
                                © {new Date().getFullYear()} Kagaoan Dental Clinic
                            </p>
                        </motion.div>
                    ) : (

                    /* ── Intake Form ── */
                    <motion.form
                        key="form"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        onSubmit={handleSubmit}
                        className="space-y-5"
                    >
                        {/* Intro */}
                        <div className="card bg-primary/5 border border-primary/20">
                            <p className="text-sm text-text-primary">
                                Welcome! Please fill in your information below. Fields marked with
                                <span className="text-red-500 font-bold mx-1">*</span>
                                are required.
                            </p>
                        </div>

                        {errors._global && (
                            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
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

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <Field label="Height">
                                        <input className="form-input" value={form.height} onChange={set('height')} placeholder="170 cm" />
                                    </Field>
                                    <Field label="Weight">
                                        <input className="form-input" value={form.weight} onChange={set('weight')} placeholder="65 kg" />
                                    </Field>
                                    <div className="col-span-2">
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
                                                <input
                                                    type="radio"
                                                    name="marital_status"
                                                    value={ms}
                                                    checked={form.marital_status === ms}
                                                    onChange={set('marital_status')}
                                                    className="text-primary focus:ring-primary/30"
                                                />
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

                        {/* Contact Information */}
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

                        {/* Patient Photo */}
                        <div className="card space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-border">
                                <Camera className="w-4 h-4 text-primary" />
                                <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Patient Photo</h3>
                                <span className="text-red-500 ml-0.5 text-sm font-bold">*</span>
                            </div>

                            {profilePhoto ? (
                                <div className="flex flex-col items-center gap-3">
                                    <img
                                        src={profilePhoto}
                                        alt="Patient photo"
                                        className="w-40 h-40 rounded-2xl object-cover border-4 border-primary/20 shadow-md"
                                    />
                                    <button
                                        type="button"
                                        className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
                                        onClick={() => { setProfilePhoto(null); openCamera(); }}
                                    >
                                        <RefreshCw className="w-4 h-4" /> Retake Photo
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4 py-4">
                                    <div className={`w-36 h-36 rounded-2xl border-2 border-dashed flex items-center justify-center bg-surface ${errors.profile_photo ? 'border-red-400 bg-red-50' : 'border-border'}`}>
                                        <Camera className={`w-10 h-10 ${errors.profile_photo ? 'text-red-400' : 'text-text-secondary opacity-40'}`} />
                                    </div>
                                    {errors.profile_photo && (
                                        <p className="text-sm text-red-500 font-medium">{errors.profile_photo}</p>
                                    )}
                                    <p className="text-sm text-text-secondary text-center">
                                        Please take a clear photo of your face for your patient record.
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            className="btn-primary"
                                            onClick={openCamera}
                                        >
                                            <Camera className="w-4 h-4" /> Open Camera
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload className="w-4 h-4" /> Upload Photo
                                        </button>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Submit */}
                        <div className="card">
                            <p className="text-xs text-text-secondary mb-4">
                                By submitting this form, you authorize Kagaoan Dental Clinic to use this information for your dental treatment and care.
                            </p>
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn-primary w-full justify-center py-3 text-base"
                            >
                                {saving ? 'Submitting...' : 'Submit My Information'}
                            </button>
                        </div>

                        <p className="text-center text-xs text-text-secondary pb-4">
                            © {new Date().getFullYear()} Kagaoan Dental Clinic
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
                            <button
                                type="button"
                                className="p-1 rounded-lg hover:bg-surface transition-colors"
                                onClick={() => { stopCamera(); setCameraOpen(false); setCameraError(''); }}
                            >
                                <X className="w-5 h-5 text-text-secondary" />
                            </button>
                        </div>
                        <div className="p-5">
                            {cameraError ? (
                                <div className="text-center py-6 space-y-4">
                                    <p className="text-sm text-red-500">{cameraError}</p>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => { setCameraOpen(false); setCameraError(''); fileInputRef.current?.click(); }}
                                    >
                                        <Upload className="w-4 h-4" /> Upload a Photo Instead
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-text-secondary mb-3 text-center">
                                        Position your face in the center and tap Capture.
                                    </p>
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full aspect-square rounded-xl bg-black object-cover"
                                    />
                                    <button
                                        type="button"
                                        className="btn-primary w-full justify-center mt-4"
                                        onClick={capturePhoto}
                                    >
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
