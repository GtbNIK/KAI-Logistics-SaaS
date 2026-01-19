import { AlertTriangle, X, Power } from 'lucide-react';

const ConfirmToggleModal = ({ isOpen, onClose, onConfirm, clientName, isActive, loading = false }) => {
    if (!isOpen) return null;

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
                            {isActive ? 'Desactivar Cliente' : 'Activar Cliente'}
                        </h3>
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
                        {isActive 
                            ? '¿Estás seguro de que deseas desactivar este cliente?' 
                            : '¿Estás seguro de que deseas activar este cliente?'}
                    </p>
                    {clientName && (
                        <div className={`p-4 rounded-xl border ${isActive ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
                            <p className="text-sm text-slate-500 mb-1">Cliente:</p>
                            <p className="font-semibold text-slate-800">{clientName}</p>
                        </div>
                    )}
                    <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                        isActive ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'
                    }`}>
                        <AlertTriangle className={`shrink-0 mt-0.5 ${isActive ? 'text-amber-600' : 'text-blue-600'}`} size={18} />
                        <p className={`text-sm ${isActive ? 'text-amber-800' : 'text-blue-800'}`}>
                            {isActive 
                                ? 'Al desactivar este cliente, no podrás crear nuevas cotizaciones ni embarques hasta que lo reactives.'
                                : 'Al activar este cliente, podrás volver a crear cotizaciones y embarques normalmente.'}
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
