import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, MapPin, User, Shield, Briefcase } from 'lucide-react';
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:3001/api' });

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

    const [form, setForm] = useState({
        last_name: '', first_name: '', middle_name: '', date_of_birth: '',
        sex: '', height: '', weight: '', occupation: '', marital_status: '',
        spouse_name: '', address: '', zip_code: '', phone: '', business_address: '',
        business_phone: '', email: '', referred_by: '', preferred_appointment_time: '',
        insurance_provider: '', insurance_id: '', notes: '',
        record_date: new Date().toISOString().slice(0, 10),
    });

    const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

    const validate = () => {
        const errs = {};
        if (!form.last_name.trim()) errs.last_name = 'Last name is required';
        if (!form.first_name.trim()) errs.first_name = 'First name is required';
        if (!form.date_of_birth) errs.date_of_birth = 'Date of birth is required';
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
            await api.post('/patients/intake', form);
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
        </div>
    );
}
