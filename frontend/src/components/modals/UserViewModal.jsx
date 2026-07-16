import { createPortal } from 'react-dom';
import { X, Mail, Phone, Briefcase, ShieldCheck } from 'lucide-react';

const UserViewModal = ({ isOpen, onClose, user }) => {
    if (!isOpen || !user || typeof document === 'undefined') return null;

    const roleBadge = user.role === 'ADMIN'
        ? 'bg-purple-100 text-purple-700'
        : 'bg-blue-100 text-blue-700';

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Detalle del Usuario</h3>
                        <p className="text-xs text-slate-500">Información de la cuenta</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-2xl font-bold text-primary">
                                {user.name?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800 text-lg leading-tight">{user.name}</p>
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 ${roleBadge}`}>
                                {user.role === 'ADMIN' ? 'Administrador' : 'Ventas'}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                            <Mail size={16} className="text-slate-400 shrink-0" />
                            <div>
                                <p className="text-xs text-slate-400 font-medium">Correo electrónico</p>
                                <p className="text-sm text-slate-700 font-medium">{user.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                            <Phone size={16} className="text-slate-400 shrink-0" />
                            <div>
                                <p className="text-xs text-slate-400 font-medium">Teléfono</p>
                                <p className="text-sm text-slate-700 font-medium">{user.phoneNumber || 'No especificado'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                            <Briefcase size={16} className="text-slate-400 shrink-0" />
                            <div>
                                <p className="text-xs text-slate-400 font-medium">Cargo</p>
                                <p className="text-sm text-slate-700 font-medium">{user.position || 'No especificado'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                            <ShieldCheck size={16} className="text-slate-400 shrink-0" />
                            <div>
                                <p className="text-xs text-slate-400 font-medium">Rol del sistema</p>
                                <p className="text-sm text-slate-700 font-medium">
                                    {user.role === 'ADMIN' ? 'Administrador' : 'Ventas'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default UserViewModal;
