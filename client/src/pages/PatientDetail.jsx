import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Trash2, ArrowLeft, Phone, Mail, Heart, Stethoscope, Calendar, ClipboardList, Smile } from 'lucide-react';
import client from '../api/client';
import { formatName, calcAge, formatDate, getInitials } from '../utils/helpers';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import PatientInfoTab from '../features/patient-info/PatientInfoTab';
import DentalChartTab from '../features/dental-chart/DentalChartTab';
import VisitsTab from '../features/visits/VisitsTab';
import MedicalHistoryTab from '../features/medical/MedicalHistoryTab';
import OrthodonticsTab from '../features/orthodontics/OrthodonticsTab';

const TABS = [
    { id: 'info', label: 'Patient Info', icon: ClipboardList },
    { id: 'dental', label: 'Dental Chart', icon: Stethoscope },
    { id: 'visits', label: 'Visits', icon: Calendar },
    { id: 'medical', label: 'Medical History', icon: Heart },
    { id: 'orthodontics', label: 'Orthodontics', icon: Smile },
];

export default function PatientDetail() {
    const { id } = useParams();
    const [sp, setSp] = useSearchParams();
    const activeTab = sp.get('tab') || 'info';
    const navigate = useNavigate();
    const toast = useToast();

    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const setTab = (t) => setSp({ tab: t });

    const fetchPatient = useCallback(async () => {
        try {
            const res = await client.get(`/patients/${id}`);
            setPatient(res.data);
        } catch (err) {
            toast.error('Failed to load patient');
            navigate('/patients');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchPatient(); }, [fetchPatient]);

    const handleDelete = async () => {
        try {
            await client.delete(`/patients/${id}`);
            toast.success('Patient deleted successfully');
            navigate('/patients');
        } catch {
            toast.error('Failed to delete patient');
        }
        setDeleteOpen(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="xl" className="text-primary" />
            </div>
        );
    }

    if (!patient) return null;

    return (
        <div className="space-y-5 animate-fade-up">
            {/* Back */}
            <Link to="/patients" className="btn-ghost -ml-2 w-fit">
                <ArrowLeft className="w-4 h-4" /> Back to Patients
            </Link>

            {/* Patient header card */}
            <div className="card">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-md">
                        {getInitials(formatName(patient))}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <h1 className="font-display text-2xl font-bold text-text-primary">{formatName(patient)}</h1>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-text-secondary">
                            <span>{calcAge(patient.date_of_birth)} years old</span>
                            {patient.sex && <span className="capitalize">• {patient.sex}</span>}
                            {patient.phone && (
                                <span className="flex items-center gap-1">
                                    <Phone className="w-3.5 h-3.5" /> {patient.phone}
                                </span>
                            )}
                            {patient.email && (
                                <span className="flex items-center gap-1">
                                    <Mail className="w-3.5 h-3.5" /> {patient.email}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {parseInt(patient.dental_issues) > 0
                                ? <span className="badge-red">{patient.dental_issues} dental issue{patient.dental_issues !== '1' ? 's' : ''}</span>
                                : <span className="badge-green">Healthy teeth</span>
                            }
                            <span className="badge-gray">{patient.total_visits} visit{patient.total_visits !== '1' ? 's' : ''}</span>
                            {patient.last_visit && <span className="badge-blue">Last visit: {formatDate(patient.last_visit)}</span>}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            className="btn-secondary"
                            onClick={() => setTab('info')}
                        >
                            <Pencil className="w-4 h-4" /> Edit
                        </button>
                        <button
                            className="btn-danger"
                            onClick={() => setDeleteOpen(true)}
                        >
                            <Trash2 className="w-4 h-4" /> Delete
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-border -mx-0">
                <div className="flex overflow-x-auto">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            className={`tab flex items-center gap-2 whitespace-nowrap ${activeTab === t.id ? 'active' : ''}`}
                            onClick={() => setTab(t.id)}
                        >
                            <t.icon className="w-4 h-4" />
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'info' && <PatientInfoTab patient={patient} onSave={fetchPatient} />}
                    {activeTab === 'dental' && <DentalChartTab patient={patient} />}
                    {activeTab === 'visits' && <VisitsTab patient={patient} />}
                    {activeTab === 'medical' && <MedicalHistoryTab patient={patient} />}
                    {activeTab === 'orthodontics' && <OrthodonticsTab patient={patient} />}
                </motion.div>
            </AnimatePresence>

            <ConfirmDialog
                isOpen={deleteOpen}
                title="Delete Patient"
                message={`Are you sure you want to delete ${formatName(patient)}? This will archive the patient record.`}
                confirmLabel="Delete Patient"
                onConfirm={handleDelete}
                onCancel={() => setDeleteOpen(false)}
            />
        </div>
    );
}
