import { AlertTriangle, X, Power, FileText } from 'lucide-react';
import { useState } from 'react';

const ConfirmToggleModal = ({ isOpen, onClose, onConfirm, entityName, name, isActive, loading = false, showNote = true }) => {
    const [deactivationNote, setDeactivationNote] = useState('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        // Si se está desactivando y el campo está visible, pasar la nota; de lo contrario, confirmar sin nota
        if (isActive && showNote) {
            onConfirm(deactivationNote);
        } else {
            onConfirm();
        }
    };

    const handleClose = () => {
        setDeactivationNote(''); // Limpiar nota al cerrar
        onClose();
    };

    return (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isActive ? 'bg-amber-50' : 'bg-green-50'}`}>
                            <Power className={isActive ? 'text-amber-600' : 'text-green-600'} size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">
                            {isActive ? `Desactivar ${entityName}` : `Activar ${entityName}`}
                        </h3>
                    </div>
                    <button 
                        onClick={handleClose}
                        disabled={loading}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <p className="text-slate-600">
                        {isActive 
                            ? `¿Estás seguro de que deseas desactivar este ${entityName}?` 
                            : `¿Estás seguro de que deseas activar este ${entityName}?`}
                    </p>
                    {name && (
                        <div className={`p-4 rounded-xl border ${isActive ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
                            <p className="text-sm text-slate-500 mb-1 capitalize">{entityName}:</p>
                            <p className="font-semibold text-slate-800">{name}</p>
                        </div>
                    )}

                    {/* Campo de nota solo cuando se desactiva y si está habilitado */}
                    {isActive && showNote && (
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <FileText size={16} className="text-slate-400" />
                                Motivo de desactivación (opcional)
                            </label>
                            <textarea
                                value={deactivationNote}
                                onChange={(e) => setDeactivationNote(e.target.value)}
                                placeholder="Ej: Cliente inactivo comercialmente, cambio de proveedor, etc."
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-slate-700 resize-none"
                                rows={3}
                                disabled={loading}
                            />
                        </div>
                    )}

                    <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                        isActive ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'
                    }`}>
                        <AlertTriangle className={`shrink-0 mt-0.5 ${isActive ? 'text-amber-600' : 'text-blue-600'}`} size={18} />
                        <p className={`text-sm ${isActive ? 'text-amber-800' : 'text-blue-800'}`}>
                            {isActive 
                                ? `Al desactivar este ${entityName}, no estará disponible para selección en formularios hasta que lo reactives.`
                                : `Al activar este ${entityName}, volverá a estar disponible para selección en formularios.`}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                    <button
                        onClick={handleClose}
                        disabled={loading}
                        className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className={`px-6 py-2.5 rounded-xl font-medium shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed text-white ${
                            isActive 
                                ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' 
                                : 'bg-green-500 hover:bg-green-600 shadow-green-500/20'
                        }`}
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                {isActive ? 'Desactivando...' : 'Activando...'}
                            </>
                        ) : (
                            <>
                                <Power size={20} />
                                {isActive ? 'Desactivar' : 'Activar'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmToggleModal;
