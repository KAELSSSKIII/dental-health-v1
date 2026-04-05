import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ isOpen, onConfirm, onCancel, title, message, confirmLabel = 'Delete', confirmClass = 'btn-danger' }) {
    if (!isOpen) return null;
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onCancel}
                    />
                    <motion.div
                        className="relative bg-white rounded-2xl shadow-modal w-full max-w-md z-10 p-6"
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-text-primary">{title || 'Are you sure?'}</h3>
                                <p className="text-sm text-text-secondary mt-0.5">{message || 'This action cannot be undone.'}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button className="btn-secondary" onClick={onCancel}>Cancel</button>
                            <button className={confirmClass} onClick={onConfirm}>{confirmLabel}</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
