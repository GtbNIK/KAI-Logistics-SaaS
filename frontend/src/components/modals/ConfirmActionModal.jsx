import { Receipt, X, Loader2, AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';

const ConfirmActionModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText = 'Confirmar', 
    cancelText = 'Cancelar',
    isWarning = false,
    loading = false
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isWarning ? 'bg-red-50' : 'bg-primary/10'}`}>
                            {isWarning 
                                ? <AlertTriangle className="text-red-600" size={24} />
                                : <Receipt className="text-primary" size={24} />
                            }
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
                    </div>
                    <button 
                        onClick={onClose}
                        disabled={loading}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <p className="text-slate-600 whitespace-pre-wrap">
                        {message}
                    </p>
                    {!isWarning && (
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
                            <Receipt className="text-blue-500 shrink-0 mt-0.5" size={16} />
                            <p className="text-sm text-blue-700">
                                Una vez generado el aviso, la cotización quedará en estado <span className="font-semibold">Convertida</span> y ya no podrá ser editada.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-6 py-2.5 text-white font-medium rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed
                            ${isWarning 
                                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' 
                                : 'bg-primary hover:bg-primary-dark shadow-primary/20'
                            }`}
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Generando...
                            </>
                        ) : (
                            <>
                                <Receipt size={18} />
                                {confirmText}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmActionModal;
