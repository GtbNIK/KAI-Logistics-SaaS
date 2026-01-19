import { X, User, FileText, Mail, Phone, MapPin, Building, Calendar, UserCheck } from 'lucide-react';

const ClientDetailModal = ({ isOpen, onClose, client }) => {
    if (!isOpen || !client) return null;

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('es-VE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 sticky top-0 backdrop-blur-md z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-xl">
                            <Building className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">{client.name}</h3>
                            <span className="px-2.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-md border border-blue-100">
                                {client.internalCode}
                            </span>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    
                    {/* Section: Identificación */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <FileText size={14} /> Información Comercial
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-xl">
                                <p className="text-xs text-slate-400 mb-1">Razón Social</p>
                                <p className="font-medium text-slate-800">{client.name}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl">
                                <p className="text-xs text-slate-400 mb-1">RIF / Cédula</p>
                                <p className="font-medium text-slate-800">{client.rifOrId}</p>
                            </div>
                        </div>
                    </div>

                    {/* Section: Contacto */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Phone size={14} /> Datos de Contacto
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-xl flex items-start gap-3">
                                <Mail className="text-slate-400 mt-0.5" size={18} />
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Email</p>
                                    <p className="font-medium text-slate-800">{client.email}</p>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl flex items-start gap-3">
                                <Phone className="text-slate-400 mt-0.5" size={18} />
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Teléfono</p>
                                    <p className="font-medium text-slate-800">{client.phone}</p>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl flex items-start gap-3 col-span-1 md:col-span-2">
                                <User className="text-slate-400 mt-0.5" size={18} />
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Persona de Contacto</p>
                                    <p className="font-medium text-slate-800">{client.contactPerson}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Ubicación */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <MapPin size={14} /> Ubicación
                        </h4>
                        <div className="space-y-3">
                            <div className="p-4 bg-slate-50 rounded-xl">
                                <p className="text-xs text-slate-400 mb-1">Dirección Fiscal</p>
                                <p className="font-medium text-slate-800">{client.address}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl">
                                <p className="text-xs text-slate-400 mb-1">Dirección de Entrega</p>
                                <p className="font-medium text-slate-800">{client.deliveryAddress}</p>
                            </div>
                            {client.referencePoint && (
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <p className="text-xs text-slate-400 mb-1">Punto de Referencia</p>
                                    <p className="font-medium text-slate-800">{client.referencePoint}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section: Asignación */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <UserCheck size={14} /> Asignación
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-xl">
                                <p className="text-xs text-slate-400 mb-1">Vendedor Asignado</p>
                                <p className="font-medium text-slate-800">{client.assignedTo?.name || 'Sin asignar'}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl flex items-start gap-3">
                                <Calendar className="text-slate-400 mt-0.5" size={18} />
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Fecha de Registro</p>
                                    <p className="font-medium text-slate-800">{formatDate(client.createdAt)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClientDetailModal;
