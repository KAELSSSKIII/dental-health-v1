import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Save, RefreshCw, Plus, Trash2, X } from 'lucide-react';
import client from '../../api/client';
import { useToast } from '../../components/Toast';
import { TOOTH_STATUSES, TOOTH_STATUS_MAP } from '../../utils/constants';
import ToothButton from './ToothButton';
import ToothStatusModal from './ToothStatusModal';
import ConfirmDialog from '../../components/ConfirmDialog';

// Arch layout: upper teeth 1-16 (right to left from viewer), lower 17-32 (right to left from viewer)
// We display right-to-patient on left, left-to-patient on right
const UPPER_TEETH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const LOWER_TEETH = [32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17];

// Curved Y offsets for arch appearance
const UPPER_CURVE = [8, 4, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 4, 8]; // px offset from top (center teeth higher)
const LOWER_CURVE = [8, 4, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 4, 8]; // same pattern mirrored

export default function DentalChartTab({ patient }) {
    const toast = useToast();
    const [teeth, setTeeth] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changes, setChanges] = useState({});
    const [selectedTooth, setSelectedTooth] = useState(null);

    // Extra teeth state
    const [addExtraOpen, setAddExtraOpen] = useState(false);
    const [extraLabel, setExtraLabel] = useState('');
    const [addingExtra, setAddingExtra] = useState(false);
    const [deleteExtraTarget, setDeleteExtraTarget] = useState(null);

    const fetchChart = useCallback(async () => {
        setLoading(true);
        try {
            const res = await client.get(`/patients/${patient.id}/dental-chart`);
            const map = {};
            res.data.forEach(t => { map[t.tooth_number] = t; });
            setTeeth(map);
            setChanges({});
        } finally {
            setLoading(false);
        }
    }, [patient.id]);

    useEffect(() => { fetchChart(); }, [fetchChart]);

    const getTooth = (num) => {
        const change = changes[num];
        const base = teeth[num];
        if (change) return { ...(base || {}), ...change };
        return base || { tooth_number: num, status: 'healthy' };
    };

    const handleToothUpdate = (num, update) => {
        setChanges(prev => ({
            ...prev,
            [num]: { ...(prev[num] || {}), tooth_number: num, ...update },
        }));
        setSelectedTooth(null);
    };

    const handleSave = async () => {
        if (Object.keys(changes).length === 0) { toast.info('No changes to save'); return; }
        setSaving(true);
        try {
            const teethArr = Object.values(changes);
            await client.put(`/patients/${patient.id}/dental-chart/bulk`, { teeth: teethArr });
            toast.success('Dental chart saved!');
            await fetchChart();
        } catch {
            toast.error('Failed to save chart');
        } finally {
            setSaving(false);
        }
    };

    // Extra teeth handlers
    const extraTeeth = Object.values(teeth).filter(t => t.is_extra);
    const standardTeeth = Object.values({ ...teeth }).filter(t => !t.is_extra);

    const handleAddExtra = async () => {
        if (!extraLabel.trim()) return;
        setAddingExtra(true);
        try {
            const res = await client.post(`/patients/${patient.id}/dental-chart/extra`, { extra_label: extraLabel.trim() });
            setTeeth(prev => ({ ...prev, [res.data.tooth_number]: res.data }));
            setExtraLabel('');
            setAddExtraOpen(false);
            toast.success('Extra tooth added');
        } catch {
            toast.error('Failed to add extra tooth');
        } finally {
            setAddingExtra(false);
        }
    };

    const handleDeleteExtra = async () => {
        if (!deleteExtraTarget) return;
        try {
            await client.delete(`/patients/${patient.id}/dental-chart/${deleteExtraTarget.tooth_number}`);
            setTeeth(prev => {
                const next = { ...prev };
                delete next[deleteExtraTarget.tooth_number];
                return next;
            });
            toast.success('Extra tooth removed');
        } catch {
            toast.error('Failed to remove extra tooth');
        } finally {
            setDeleteExtraTarget(null);
        }
    };

    // Stats
    const allTeeth = Object.keys({ ...teeth, ...changes }).map(n => getTooth(parseInt(n)));
    const standardCount = allTeeth.filter(t => !teeth[parseInt(Object.keys(teeth).find(k => parseInt(k) === parseInt(Object.keys(t)[0])))]?.is_extra).length;
    const healthy = allTeeth.filter(t => t.status === 'healthy').length;
    const issues = allTeeth.filter(t => t.status !== 'healthy').length;
    const hasChanges = Object.keys(changes).length > 0;

    const renderArch = (numbers, curve, isUpper) => (
        <div className={`flex ${isUpper ? 'items-start' : 'items-end'} justify-center gap-1.5 px-6 py-3`}>
            {numbers.map((num, i) => {
                const t = getTooth(num);
                // Upper: push corner teeth down via marginTop to create arch curve
                // Lower: push corner teeth up via marginBottom
                const yOffset = isUpper
                    ? { marginTop: `${curve[i]}px` }
                    : { marginBottom: `${curve[i]}px` };
                return (
                    <ToothButton
                        key={num}
                        number={num}
                        status={t?.status || 'healthy'}
                        isUpper={isUpper}
                        hasChange={!!changes[num]}
                        style={yOffset}
                        onClick={() => setSelectedTooth({ number: num, tooth: t })}
                    />
                );
            })}
        </div>
    );

    return (
        <div className="space-y-5">
            {/* Chart container */}
            <div className="card">
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div>
                        <h2 className="font-semibold text-text-primary">Interactive Dental Chart</h2>
                        <p className="text-xs text-text-secondary">Click any tooth to update its status</p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button className="btn-ghost text-xs" onClick={fetchChart} disabled={loading}>
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            className={`btn-primary text-sm flex-1 sm:flex-none ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={handleSave}
                            disabled={!hasChanges || saving}
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : `Save ${hasChanges ? `(${Object.keys(changes).length})` : ''}`}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="text-text-secondary text-sm">Loading dental chart...</div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="min-w-[700px]">
                            {/* Direction labels */}
                            <div className="flex justify-between px-10 mb-1">
                                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Patient's Right</span>
                                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Patient's Left</span>
                            </div>

                            {/* Upper jaw */}
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary/40 uppercase tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg) translateY(50%)' }}>UPPER</div>
                                <div className="bg-gradient-to-b from-pink-50/70 via-white to-white border border-border/50 rounded-t-3xl pt-4">
                                    {renderArch(UPPER_TEETH, UPPER_CURVE, true)}
                                </div>
                            </div>

                            {/* Jaw divider */}
                            <div className="flex items-center gap-3 py-2 px-4">
                                <div className="flex-1 border-t-2 border-dashed border-border" />
                                <span className="text-[10px] text-text-secondary font-semibold px-2 uppercase tracking-widest">Jaw Line</span>
                                <div className="flex-1 border-t-2 border-dashed border-border" />
                            </div>

                            {/* Lower jaw */}
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary/40 uppercase tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg) translateY(50%)' }}>LOWER</div>
                                <div className="bg-gradient-to-t from-pink-50/70 via-white to-white border border-border/50 rounded-b-3xl pb-4">
                                    {renderArch(LOWER_TEETH, LOWER_CURVE, false)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Legend */}
                <div className="mt-6 pt-4 border-t border-border">
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Status Legend</p>
                    <div className="flex flex-wrap gap-2">
                        {TOOTH_STATUSES.map(s => (
                            <span
                                key={s.value}
                                className="badge text-xs"
                                style={{ backgroundColor: s.bg, color: s.text }}
                            >
                                {s.label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total Teeth', value: 32 + extraTeeth.length, color: 'bg-primary/10 text-primary' },
                    { label: 'Healthy', value: healthy, color: 'bg-green-50 text-green-700' },
                    { label: 'Issues', value: issues, color: 'bg-red-50 text-red-700' },
                    { label: 'Total Visits', value: patient.total_visits || 0, color: 'bg-blue-50 text-blue-700' },
                ].map((s, i) => (
                    <motion.div
                        key={s.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`card-sm text-center ${s.color}`}
                    >
                        <p className="text-2xl font-bold">{s.value}</p>
                        <p className="text-xs font-medium mt-0.5">{s.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Extra / Supernumerary Teeth */}
            <div className="card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h3 className="font-semibold text-text-primary">Extra / Supernumerary Teeth</h3>
                        <p className="text-xs text-text-secondary mt-0.5">
                            {extraTeeth.length === 0 ? 'No extra teeth recorded' : `${extraTeeth.length} extra tooth${extraTeeth.length !== 1 ? 'teeth' : ''} recorded`}
                        </p>
                    </div>
                    <button className="btn-primary text-sm w-full sm:w-auto" onClick={() => { setExtraLabel(''); setAddExtraOpen(true); }}>
                        <Plus className="w-4 h-4" /> Add Extra Tooth
                    </button>
                </div>

                {extraTeeth.length === 0 ? (
                    <p className="text-sm text-text-secondary text-center py-4 border border-dashed border-border rounded-xl">
                        No supernumerary teeth. Click "Add Extra Tooth" if the patient has more than 32 teeth.
                    </p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {extraTeeth.map((et, i) => {
                            const cfg = TOOTH_STATUS_MAP[et.status] || TOOTH_STATUS_MAP.healthy;
                            const change = changes[et.tooth_number];
                            const current = change ? { ...et, ...change } : et;
                            const currentCfg = TOOTH_STATUS_MAP[current.status] || TOOTH_STATUS_MAP.healthy;
                            return (
                                <motion.div
                                    key={et.tooth_number}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="relative border border-border rounded-xl p-3 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all group"
                                    style={{ backgroundColor: currentCfg.bg }}
                                    onClick={() => setSelectedTooth({ number: et.tooth_number, tooth: current, isExtra: true })}
                                >
                                    <button
                                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-100 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 z-10"
                                        onClick={(e) => { e.stopPropagation(); setDeleteExtraTarget(et); }}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                    <p className="text-xs font-bold text-text-secondary mb-1">#{et.tooth_number}</p>
                                    <p className="text-sm font-semibold text-text-primary leading-tight pr-5">{et.extra_label}</p>
                                    <span
                                        className="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full"
                                        style={{ backgroundColor: currentCfg.bg, color: currentCfg.text, border: `1px solid ${currentCfg.color}` }}
                                    >
                                        {currentCfg.label}
                                    </span>
                                    {changes[et.tooth_number] && (
                                        <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-amber-400" />
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add Extra Tooth modal */}
            {addExtraOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                            <h3 className="font-semibold text-text-primary">Add Extra Tooth</h3>
                            <button className="p-1 rounded-lg hover:bg-surface" onClick={() => setAddExtraOpen(false)}>
                                <X className="w-5 h-5 text-text-secondary" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <p className="text-sm text-text-secondary">
                                Give this supernumerary tooth a descriptive label, e.g. "Mesiodens", "Upper Right 4th Molar", "Lower Extra Premolar".
                            </p>
                            <div>
                                <label className="form-label">Tooth Label <span className="text-red-500">*</span></label>
                                <input
                                    className="form-input"
                                    placeholder="e.g. Mesiodens, 4th Molar..."
                                    value={extraLabel}
                                    onChange={e => setExtraLabel(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddExtra()}
                                    autoFocus
                                />
                            </div>
                            <div className="flex flex-col-reverse sm:flex-row gap-3">
                                <button className="btn-ghost flex-1" onClick={() => setAddExtraOpen(false)}>Cancel</button>
                                <button
                                    className="btn-primary flex-1"
                                    onClick={handleAddExtra}
                                    disabled={!extraLabel.trim() || addingExtra}
                                >
                                    {addingExtra ? 'Adding...' : 'Add Tooth'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tooth status modal */}
            {selectedTooth && (
                <ToothStatusModal
                    tooth={selectedTooth}
                    onSave={handleToothUpdate}
                    onClose={() => setSelectedTooth(null)}
                />
            )}

            {/* Delete extra tooth confirm */}
            <ConfirmDialog
                isOpen={!!deleteExtraTarget}
                title="Remove Extra Tooth"
                message={`Remove "${deleteExtraTarget?.extra_label}" (tooth #${deleteExtraTarget?.tooth_number}) from this patient's chart?`}
                confirmLabel="Remove"
                onConfirm={handleDeleteExtra}
                onCancel={() => setDeleteExtraTarget(null)}
            />
        </div>
    );
}
