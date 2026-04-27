import { AlertTriangle, X } from 'lucide-react';

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, title, message, itemName, loading = false }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 rounded-xl">
                            <AlertTriangle className="text-red-600" size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">{title || 'Confirmar Eliminación'}</h3>
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
                    <p className="text-slate-600">
                        {message || '¿Estás seguro de que deseas eliminar este elemento?'}
                    </p>
                    {itemName && (
                        <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                            <p className="text-sm text-slate-500 mb-1">Elemento a eliminar:</p>
                            <p className="font-semibold text-slate-800">{itemName}</p>
                        </div>
                    )}
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                        <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                        <p className="text-sm text-amber-800">
                            Esta acción no se puede deshacer. Todos los datos asociados se perderán permanentemente.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-red-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Eliminando...
                            </>
                        ) : (
                            <>
                                <AlertTriangle size={20} />
                                Eliminar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDeleteModal;
