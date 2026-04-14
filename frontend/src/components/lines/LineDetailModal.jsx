import { Ship, Plane, X, Hash } from 'lucide-react';

const LineDetailModal = ({ isOpen, onClose, item, type }) => {
    if (!isOpen || !item) return null;

    return (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className={`flex items-center justify-between px-6 py-4 border-b border-slate-100 ${
                    type === 'shipping' ? 'bg-purple-50/50' : 'bg-blue-50/50'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${
                            type === 'shipping' ? 'bg-purple-100' : 'bg-blue-100'
                        }`}>
                            {type === 'shipping'
                                ? <Ship className="text-purple-600" size={20} />
                                : <Plane className="text-blue-600" size={20} />
                            }
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">{item.name}</h3>
                            <p className="text-sm text-slate-500">
                                {type === 'shipping' ? 'Línea Naviera' : 'Línea Aérea'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <Hash size={16} className="text-slate-400" />
                        <div>
                            <p className="text-xs text-slate-400 font-medium">Código</p>
                            <p className="text-sm font-semibold text-slate-700">{item.code || '—'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        {type === 'shipping'
                            ? <Ship size={16} className="text-slate-400" />
                            : <Plane size={16} className="text-slate-400" />
                        }
                        <div>
                            <p className="text-xs text-slate-400 font-medium">Nombre</p>
                            <p className="text-sm font-semibold text-slate-700">{item.name}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <div className={`w-2.5 h-2.5 rounded-full ${item.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <div>
                            <p className="text-xs text-slate-400 font-medium">Estado</p>
                            <p className={`text-sm font-semibold ${item.isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                                {item.isActive ? 'Activa' : 'Inactiva'}
                            </p>
                        </div>
                    </div>

                    {item.createdAt && (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <div>
                                <p className="text-xs text-slate-400 font-medium">Fecha de creación</p>
                                <p className="text-sm text-slate-700">
                                    {new Date(item.createdAt).toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                    <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LineDetailModal;
