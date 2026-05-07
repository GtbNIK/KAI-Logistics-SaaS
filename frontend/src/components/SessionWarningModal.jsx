import { AlertTriangle, LogOut } from 'lucide-react';
import { createPortal } from 'react-dom';

const SessionWarningModal = ({ isOpen, onClose, onLogout, minutesLeft }) => {
    if (!isOpen || typeof document === 'undefined') return null;

    const modal = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-amber-50/50">
                    <div className="p-2 bg-amber-100 rounded-xl">
                        <AlertTriangle className="text-amber-600" size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Sesión por expirar</h3>
                        <p className="text-xs text-amber-600 font-medium">Acción requerida</p>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <p className="text-slate-600 text-sm leading-relaxed">
                        Tu sesión expirará en aproximadamente <strong className="text-amber-600">{minutesLeft} minutos</strong>.
                        Por seguridad, deberás iniciar sesión nuevamente.
                    </p>
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
                        💡 Guarda cualquier trabajo en progreso antes de que la sesión se cierre automáticamente.
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors text-sm"
                    >
                        Entendido
                    </button>
                    <button
                        onClick={onLogout}
                        className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all active:scale-95 text-sm"
                    >
                        <LogOut size={16} />
                        Cerrar Sesión Ahora
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
};

export default SessionWarningModal;
