import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Upload, Trash2, X, ZoomIn, ImageOff } from 'lucide-react';
import client from '../../api/client';
import { useToast } from '../../components/Toast';
import ConfirmDialog from '../../components/ConfirmDialog';
import LoadingSpinner from '../../components/LoadingSpinner';

const TYPE_LABELS = {
    before: 'Before',
    after: 'After',
    xray: 'X-Ray',
    intraoral: 'Intraoral',
    panoramic: 'Panoramic',
    other: 'Other',
};
const TYPE_ORDER = ['before', 'after', 'xray', 'intraoral', 'panoramic', 'other'];

function resizeImage(dataUrl, maxPx = 1024) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * ratio);
            canvas.height = Math.round(img.height * ratio);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = dataUrl;
    });
}

export default function PhotosTab({ patient }) {
    const toast = useToast();
    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Camera modal
    const [cameraOpen, setCameraOpen] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [capturedImage, setCapturedImage] = useState(null);

    // Save form (shown after capture/upload)
    const [saveFormOpen, setSaveFormOpen] = useState(false);
    const [form, setForm] = useState({ photo_type: 'other', label: '', notes: '' });

    // Lightbox
    const [lightboxPhoto, setLightboxPhoto] = useState(null);

    // Delete confirm
    const [deleteTarget, setDeleteTarget] = useState(null);

    const fetchPhotos = useCallback(async () => {
        try {
            const res = await client.get(`/patients/${patient.id}/photos`);
            setPhotos(res.data);
        } catch {
            toast.error('Failed to load photos');
        } finally {
            setLoading(false);
        }
    }, [patient.id]);

    useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

    // ── Camera ────────────────────────────────────────────────
    const openCamera = async () => {
        setCameraError('');
        setCapturedImage(null);
        setCameraOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            setCameraError(
                err.name === 'NotAllowedError'
                    ? 'Camera access denied. Please allow camera permission in your browser.'
                    : 'Could not access camera. Try uploading a file instead.'
            );
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
    };

    const closeCamera = () => {
        stopCamera();
        setCameraOpen(false);
        setCameraError('');
    };

    const capture = async () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const raw = canvas.toDataURL('image/jpeg', 0.9);
        stopCamera();
        const compressed = await resizeImage(raw, 1024);
        setCapturedImage(compressed);
        setCameraOpen(false);
        setForm({ photo_type: 'other', label: '', notes: '' });
        setSaveFormOpen(true);
    };

    // ── File upload ───────────────────────────────────────────
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const compressed = await resizeImage(ev.target.result, 1024);
            setCapturedImage(compressed);
            setForm({ photo_type: 'other', label: '', notes: '' });
            setSaveFormOpen(true);
        };
        reader.readAsDataURL(file);
    };

    // ── Save ──────────────────────────────────────────────────
    const handleSave = async () => {
        if (!capturedImage) return;
        setSaving(true);
        try {
            await client.post(`/patients/${patient.id}/photos`, {
                photo_data: capturedImage,
                photo_type: form.photo_type,
                label: form.label.trim() || undefined,
                notes: form.notes.trim() || undefined,
            });
            toast.success('Photo saved');
            setSaveFormOpen(false);
            setCapturedImage(null);
            await fetchPhotos();
        } catch {
            toast.error('Failed to save photo');
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await client.delete(`/patients/${patient.id}/photos/${deleteTarget}`);
            toast.success('Photo deleted');
            setPhotos((prev) => prev.filter((p) => p.id !== deleteTarget));
        } catch {
            toast.error('Failed to delete photo');
        }
        setDeleteTarget(null);
    };

    // ── Group photos by type ──────────────────────────────────
    const grouped = TYPE_ORDER.reduce((acc, type) => {
        const list = photos.filter((p) => p.photo_type === type);
        if (list.length) acc[type] = list;
        return acc;
    }, {});

    if (loading) {
        return (
            <div className="flex items-center justify-center h-40">
                <LoadingSpinner size="lg" className="text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-text-primary">Patient Photos</h2>
                    <p className="text-sm text-text-secondary mt-0.5">
                        {photos.length} photo{photos.length !== 1 ? 's' : ''} on record
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <button className="btn-secondary w-full sm:w-auto" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-4 h-4" /> Upload File
                    </button>
                    <button className="btn-primary w-full sm:w-auto" onClick={openCamera}>
                        <Camera className="w-4 h-4" /> Take Photo
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </div>
            </div>

            {/* Gallery */}
            {photos.length === 0 ? (
                <div className="card flex flex-col items-center justify-center py-16 text-center">
                    <ImageOff className="w-12 h-12 text-text-secondary mb-3 opacity-40" />
                    <p className="text-text-secondary font-medium">No photos yet</p>
                    <p className="text-sm text-text-secondary mt-1 opacity-70">
                        Take a photo or upload an image to start the patient's photo record.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(grouped).map(([type, list]) => (
                        <div key={type}>
                            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
                                {TYPE_LABELS[type]} ({list.length})
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {list.map((photo) => (
                                    <div
                                        key={photo.id}
                                        className="card p-0 overflow-hidden group relative cursor-pointer"
                                        onClick={() => setLightboxPhoto(photo)}
                                    >
                                        <img
                                            src={photo.photo_data}
                                            alt={photo.label || TYPE_LABELS[photo.photo_type]}
                                            className="w-full aspect-square object-cover"
                                        />
                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                            <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        {/* Delete button */}
                                        <button
                                            className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(photo.id); }}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                        {/* Caption */}
                                        <div className="p-2 bg-white border-t border-border">
                                            {photo.label && (
                                                <p className="text-xs font-medium text-text-primary truncate">{photo.label}</p>
                                            )}
                                            <p className="text-xs text-text-secondary">
                                                {new Date(photo.uploaded_at).toLocaleDateString('en-US', {
                                                    month: 'short', day: 'numeric', year: 'numeric',
                                                })}
                                            </p>
                                            {photo.uploaded_by_name && (
                                                <p className="text-xs text-text-secondary truncate">by {photo.uploaded_by_name}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Camera modal */}
            {cameraOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                            <h3 className="font-semibold text-text-primary">Take Photo</h3>
                            <button className="btn-ghost p-1" onClick={closeCamera}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5">
                            {cameraError ? (
                                <div className="text-center py-8">
                                    <p className="text-sm text-red-500 mb-4">{cameraError}</p>
                                    <button className="btn-secondary" onClick={closeCamera}>Close</button>
                                </div>
                            ) : (
                                <>
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full rounded-xl bg-black aspect-video object-cover"
                                    />
                                    <div className="flex justify-center mt-4">
                                        <button className="btn-primary px-8" onClick={capture}>
                                            <Camera className="w-4 h-4" /> Capture
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Save form modal */}
            {saveFormOpen && capturedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                            <h3 className="font-semibold text-text-primary">Save Photo</h3>
                            <button
                                className="btn-ghost p-1"
                                onClick={() => { setSaveFormOpen(false); setCapturedImage(null); }}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <img
                                src={capturedImage}
                                alt="Preview"
                                className="w-full max-h-56 object-contain rounded-xl bg-surface border border-border"
                            />
                            <div>
                                <label className="form-label">Photo Type</label>
                                <select
                                    className="form-select"
                                    value={form.photo_type}
                                    onChange={(e) => setForm((f) => ({ ...f, photo_type: e.target.value }))}
                                >
                                    {TYPE_ORDER.map((t) => (
                                        <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Label <span className="text-text-secondary font-normal">(optional)</span></label>
                                <input
                                    className="form-input"
                                    placeholder="e.g. Front view, Month 3…"
                                    value={form.label}
                                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="form-label">Notes <span className="text-text-secondary font-normal">(optional)</span></label>
                                <textarea
                                    className="form-textarea"
                                    rows={2}
                                    placeholder="Any notes about this photo…"
                                    value={form.notes}
                                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                                />
                            </div>
                            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
                                <button
                                    className="btn-ghost flex-1"
                                    onClick={() => { setSaveFormOpen(false); setCapturedImage(null); }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn-primary flex-1"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? <LoadingSpinner size="sm" /> : null}
                                    {saving ? 'Saving…' : 'Save Photo'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox */}
            {lightboxPhoto && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
                    onClick={() => setLightboxPhoto(null)}
                >
                    <button
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                        onClick={() => setLightboxPhoto(null)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={lightboxPhoto.photo_data}
                            alt={lightboxPhoto.label || TYPE_LABELS[lightboxPhoto.photo_type]}
                            className="w-full max-h-[80vh] object-contain rounded-xl"
                        />
                        <div className="mt-3 text-center text-white/80 text-sm space-y-0.5">
                            <p className="font-medium text-white">
                                {TYPE_LABELS[lightboxPhoto.photo_type]}
                                {lightboxPhoto.label ? ` — ${lightboxPhoto.label}` : ''}
                            </p>
                            <p>
                                {new Date(lightboxPhoto.uploaded_at).toLocaleDateString('en-US', {
                                    month: 'long', day: 'numeric', year: 'numeric',
                                })}
                                {lightboxPhoto.uploaded_by_name ? ` · ${lightboxPhoto.uploaded_by_name}` : ''}
                            </p>
                            {lightboxPhoto.notes && <p className="opacity-70 italic">{lightboxPhoto.notes}</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            <ConfirmDialog
                isOpen={!!deleteTarget}
                title="Delete Photo"
                message="Are you sure you want to delete this photo? This cannot be undone."
                confirmLabel="Delete Photo"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
