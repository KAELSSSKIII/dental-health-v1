import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, User, MapPin, Briefcase, Shield, AlertCircle } from 'lucide-react';
import client from '../api/client';
import { useToast } from '../components/Toast';
import { toLocalDateInput } from '../utils/helpers';

const Section = ({ title, icon: Icon, children }) => (
    <div className="card space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Icon className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">{title}</h3>
        </div>
        {children}
    </div>
);

const Field = ({ label, required, error, children }) => (
    <div>
        <label className="form-label">{label}{required && ' *'}</label>
        {children}
        {error && <p className="form-error">{error}</p>}
    </div>
);

export default function PatientNew() {
    const navigate = useNavigate();
    const toast = useToast();
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [duplicate, setDuplicate] = useState(null);

    const [form, setForm] = useState({
        last_name: '', first_name: '', middle_name: '', date_of_birth: '',
        sex: '', height: '', weight: '', occupation: '', marital_status: '',
        spouse_name: '', address: '', zip_code: '', phone: '', business_address: '',
        business_phone: '', email: '', referred_by: '', preferred_appointment_time: '',
        insurance_provider: '', insurance_id: '', notes: '',
        record_date: toLocalDateInput(new Date()),
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
        setDuplicate(null);
        if (!validate()) return;
        setSaving(true);
        try {
            const res = await client.post('/patients', form);
            toast.success('Patient added successfully!');
            navigate(`/patients/${res.data.id}`, { replace: true });
        } catch (err) {
            if (err.response?.status === 409) {
                setDuplicate(err.response.data.existingPatient);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else if (err.response?.data?.errors) {
                const mapped = {};
                err.response.data.errors.forEach(e => { mapped[e.path] = e.msg; });
                setErrors(mapped);
            } else {
                toast.error(err.response?.data?.error || 'Failed to add patient');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5 animate-fade-up">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <Link to="/patients" className="btn-ghost -ml-2">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Link>
                    <div>
                        <h1 className="font-display text-2xl font-bold text-text-primary">New Patient</h1>
                        <p className="text-text-secondary text-sm">Fill in the patient's information</p>
                    </div>
                </div>
                <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Patient</>}
                </button>
            </div>

            {/* Duplicate warning */}
            {duplicate && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-amber-800">Patient already exists</p>
                        <p className="text-sm text-amber-700 mt-0.5">
                            A record for <strong>{duplicate.last_name}, {duplicate.first_name}</strong> with
                            the same date of birth already exists in the system. Please update the existing record instead.
                        </p>
                        <Link
                            to={`/patients/${duplicate.id}`}
                            className="inline-block mt-2 text-sm font-semibold text-primary hover:underline"
                        >
                            View existing patient record →
                        </Link>
                    </div>
                </div>
            )}

            {/* Personal */}
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    <Field label="Record Date">
                        <input type="date" className="form-input" value={form.record_date} onChange={set('record_date')} />
                    </Field>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Field label="Height"><input className="form-input" value={form.height} onChange={set('height')} placeholder="170 cm" /></Field>
                    <Field label="Weight"><input className="form-input" value={form.weight} onChange={set('weight')} placeholder="65 kg" /></Field>
                    <Field label="Occupation" ><input className="form-input sm:col-span-2" value={form.occupation} onChange={set('occupation')} placeholder="Engineer" /></Field>
                </div>
                <div>
                    <label className="form-label">Marital Status</label>
                    <div className="flex flex-wrap gap-4 mt-1">
                        {['single', 'married', 'widowed', 'divorced'].map(ms => (
                            <label key={ms} className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="marital_status" value={ms} checked={form.marital_status === ms} onChange={set('marital_status')} className="text-primary focus:ring-primary/30" />
                                <span className="text-sm capitalize text-text-primary">{ms}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Spouse Name"><input className="form-input" value={form.spouse_name} onChange={set('spouse_name')} /></Field>
                    <Field label="Referred By"><input className="form-input" value={form.referred_by} onChange={set('referred_by')} /></Field>
                </div>
                <Field label="Preferred Appointment Time">
                    <input className="form-input" value={form.preferred_appointment_time} onChange={set('preferred_appointment_time')} placeholder="Morning, 9–11 AM" />
                </Field>
            </Section>

            {/* Contact */}
            <Section title="Contact Information" icon={MapPin}>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-3">
                        <Field label="Home Address">
                            <textarea className="form-textarea" rows={2} value={form.address} onChange={set('address')} placeholder="123 Burgos St., Vigan City" />
                        </Field>
                    </div>
                    <Field label="ZIP Code"><input className="form-input" value={form.zip_code} onChange={set('zip_code')} placeholder="2700" /></Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Phone"><input className="form-input" value={form.phone} onChange={set('phone')} placeholder="09171234567" /></Field>
                    <Field label="Email"><input type="email" className="form-input" value={form.email} onChange={set('email')} placeholder="patient@email.com" /></Field>
                    <Field label="Business Phone"><input className="form-input" value={form.business_phone} onChange={set('business_phone')} /></Field>
                </div>
                <Field label="Business Address">
                    <textarea className="form-textarea" rows={2} value={form.business_address} onChange={set('business_address')} />
                </Field>
            </Section>

            {/* Insurance */}
            <Section title="Insurance Information" icon={Shield}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Insurance Provider"><input className="form-input" value={form.insurance_provider} onChange={set('insurance_provider')} placeholder="PhilHealth" /></Field>
                    <Field label="Insurance ID"><input className="form-input" value={form.insurance_id} onChange={set('insurance_id')} placeholder="PH-12345678" /></Field>
                </div>
            </Section>

            {/* Notes */}
            <Section title="Additional Notes" icon={Briefcase}>
                <Field label="Notes">
                    <textarea className="form-textarea" rows={3} value={form.notes} onChange={set('notes')} placeholder="Any additional notes..." />
                </Field>
            </Section>

            <div className="flex justify-end gap-3">
                <Link to="/patients" className="btn-secondary">Cancel</Link>
                <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Patient</>}
                </button>
            </div>
        </form>
    );
}
