import { useState, useEffect } from 'react';
import { Save, MapPin, Phone, User, Calendar, Briefcase, Heart, Shield } from 'lucide-react';
import client from '../../api/client';
import { useToast } from '../../components/Toast';
import { formatDate } from '../../utils/helpers';
import { printPatientRecord } from '../../utils/print';

const Section = ({ title, icon: Icon, children }) => (
    <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Icon className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">{title}</h3>
        </div>
        {children}
    </div>
);

const Field = ({ label, children, error }) => (
    <div>
        <label className="form-label">{label}</label>
        {children}
        {error && <p className="form-error">{error}</p>}
    </div>
);

const Input = ({ ...props }) => (
    <input className="form-input" {...props} />
);

const Select = ({ children, ...props }) => (
    <select className="form-select" {...props}>{children}</select>
);

const Textarea = ({ ...props }) => (
    <textarea className="form-textarea" rows={3} {...props} />
);

export default function PatientInfoTab({ patient, onSave }) {
    const toast = useToast();
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState(null);
    const [errors, setErrors] = useState({});

    const [form, setForm] = useState({
        last_name: '', first_name: '', middle_name: '', date_of_birth: '',
        sex: '', height: '', weight: '', occupation: '', marital_status: '',
        spouse_name: '', address: '', zip_code: '', phone: '', business_address: '',
        business_phone: '', email: '', referred_by: '', preferred_appointment_time: '',
        insurance_provider: '', insurance_id: '', notes: '', record_date: '',
    });

    useEffect(() => {
        if (patient) {
            setForm({
                last_name: patient.last_name || '',
                first_name: patient.first_name || '',
                middle_name: patient.middle_name || '',
                date_of_birth: patient.date_of_birth ? patient.date_of_birth.slice(0, 10) : '',
                sex: patient.sex || '',
                height: patient.height || '',
                weight: patient.weight || '',
                occupation: patient.occupation || '',
                marital_status: patient.marital_status || '',
                spouse_name: patient.spouse_name || '',
                address: patient.address || '',
                zip_code: patient.zip_code || '',
                phone: patient.phone || '',
                business_address: patient.business_address || '',
                business_phone: patient.business_phone || '',
                email: patient.email || '',
                referred_by: patient.referred_by || '',
                preferred_appointment_time: patient.preferred_appointment_time || '',
                insurance_provider: patient.insurance_provider || '',
                insurance_id: patient.insurance_id || '',
                notes: patient.notes || '',
                record_date: patient.record_date ? patient.record_date.slice(0, 10) : '',
            });
        }
    }, [patient]);

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
        if (!validate()) return;
        setSaving(true);
        try {
            await client.put(`/patients/${patient.id}`, form);
            toast.success('Patient record saved successfully!');
            setSavedAt(new Date());
            onSave?.();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save record');
        } finally {
            setSaving(false);
        }
    };

    const timeSince = (d) => {
        if (!d) return '';
        const mins = Math.floor((Date.now() - d) / 60000);
        if (mins < 1) return 'just now';
        if (mins === 1) return '1 minute ago';
        return `${mins} minutes ago`;
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Print header */}
            <div className="card text-center py-4">
                <h2 className="font-display text-xl font-bold text-text-primary">PATIENT HEALTH RECORD</h2>
                <p className="text-text-secondary text-sm mt-1">Plaza Maestro Annex, Burgos St., Vigan City, Ilocos Sur · Tel. 722-2420</p>
                <div className="flex items-center justify-center gap-2 mt-3">
                    <label className="form-label mb-0">Record Date:</label>
                    <Input type="date" value={form.record_date} onChange={set('record_date')} className="form-input w-auto" />
                </div>
            </div>

            {/* Personal Information */}
            <div className="card space-y-5">
                <Section title="Personal Information" icon={User}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Field label="Last Name *" error={errors.last_name}>
                            <Input value={form.last_name} onChange={set('last_name')} placeholder="Dela Cruz" />
                        </Field>
                        <Field label="First Name *" error={errors.first_name}>
                            <Input value={form.first_name} onChange={set('first_name')} placeholder="Juan" />
                        </Field>
                        <Field label="Middle Name">
                            <Input value={form.middle_name} onChange={set('middle_name')} placeholder="Reyes" />
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Date of Birth *" error={errors.date_of_birth}>
                            <Input type="date" value={form.date_of_birth} onChange={set('date_of_birth')} />
                        </Field>
                        <Field label="Sex">
                            <Select value={form.sex} onChange={set('sex')}>
                                <option value="">Select sex</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </Select>
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <Field label="Height"><Input value={form.height} onChange={set('height')} placeholder="170 cm" /></Field>
                        <Field label="Weight"><Input value={form.weight} onChange={set('weight')} placeholder="65 kg" /></Field>
                        <Field label="Occupation" className="sm:col-span-2">
                            <Input value={form.occupation} onChange={set('occupation')} placeholder="Engineer" />
                        </Field>
                    </div>

                    <div>
                        <label className="form-label">Marital Status</label>
                        <div className="flex flex-wrap gap-3 mt-1">
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
                        <Field label="Spouse Name"><Input value={form.spouse_name} onChange={set('spouse_name')} placeholder="Maria Dela Cruz" /></Field>
                        <Field label="Referred By"><Input value={form.referred_by} onChange={set('referred_by')} placeholder="Dr. Santos" /></Field>
                    </div>

                    <Field label="Preferred Appointment Time">
                        <Input value={form.preferred_appointment_time} onChange={set('preferred_appointment_time')} placeholder="Morning, 9-11 AM" />
                    </Field>
                </Section>
            </div>

            {/* Contact Information */}
            <div className="card space-y-5">
                <Section title="Contact Information" icon={MapPin}>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="sm:col-span-3">
                            <Field label="Home Address"><Textarea value={form.address} onChange={set('address')} rows={2} placeholder="123 Burgos St., Vigan City" /></Field>
                        </div>
                        <Field label="ZIP Code"><Input value={form.zip_code} onChange={set('zip_code')} placeholder="2700" /></Field>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Field label="Phone"><Input value={form.phone} onChange={set('phone')} placeholder="09171234567" /></Field>
                        <Field label="Email"><Input type="email" value={form.email} onChange={set('email')} placeholder="patient@email.com" /></Field>
                        <Field label="Business Phone"><Input value={form.business_phone} onChange={set('business_phone')} placeholder="09987654321" /></Field>
                    </div>
                    <Field label="Business Address"><Textarea value={form.business_address} onChange={set('business_address')} rows={2} placeholder="Business address" /></Field>
                </Section>
            </div>

            {/* Insurance */}
            <div className="card space-y-5">
                <Section title="Insurance Information" icon={Shield}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Insurance Provider"><Input value={form.insurance_provider} onChange={set('insurance_provider')} placeholder="PhilHealth" /></Field>
                        <Field label="Insurance ID"><Input value={form.insurance_id} onChange={set('insurance_id')} placeholder="PH-12345678" /></Field>
                    </div>
                </Section>
            </div>

            {/* Notes */}
            <div className="card">
                <Section title="Additional Notes" icon={Briefcase}>
                    <Field label="Notes">
                        <Textarea value={form.notes} onChange={set('notes')} rows={4} placeholder="Any additional notes about this patient..." />
                    </Field>
                </Section>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-xs text-text-secondary">
                    {savedAt ? `Last saved ${timeSince(savedAt)}` : 'Unsaved changes'}
                </p>
                <div className="flex items-center gap-3">
                    <button type="button" className="btn-secondary" onClick={() => printPatientRecord(form, patient)}>
                        Print Record
                    </button>
                    <button type="submit" className="btn-primary" disabled={saving}>
                        {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Record</>}
                    </button>
                </div>
            </div>
        </form>
    );
}
