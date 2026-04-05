import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Save, RefreshCw } from 'lucide-react';
import client from '../../api/client';
import { useToast } from '../../components/Toast';
import { TOOTH_STATUSES, TOOTH_STATUS_MAP } from '../../utils/constants';
import ToothButton from './ToothButton';
import ToothStatusModal from './ToothStatusModal';

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

    // Stats
    const allTeeth = Object.keys({ ...teeth, ...changes }).map(n => getTooth(parseInt(n)));
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
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="font-semibold text-text-primary">Interactive Dental Chart</h2>
                        <p className="text-xs text-text-secondary">Click any tooth to update its status</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="btn-ghost text-xs" onClick={fetchChart} disabled={loading}>
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            className={`btn-primary text-sm ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                    { label: 'Total Teeth', value: 32, color: 'bg-primary/10 text-primary' },
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

            {/* Tooth modal */}
            {selectedTooth && (
                <ToothStatusModal
                    tooth={selectedTooth}
                    onSave={handleToothUpdate}
                    onClose={() => setSelectedTooth(null)}
                />
            )}
        </div>
    );
}
