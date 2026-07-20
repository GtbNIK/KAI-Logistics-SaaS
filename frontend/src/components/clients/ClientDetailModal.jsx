import { useState, useEffect } from 'react';
import { X, User, FileText, Mail, Phone, MapPin, Building, Calendar, UserCheck, AlertCircle, Clock, Wallet } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const ClientDetailModal = ({ isOpen, onClose, client }) => {
    const { user } = useAuth();
    const [receivablesSummary, setReceivablesSummary] = useState(null);
    const [loadingReceivables, setLoadingReceivables] = useState(false);

    useEffect(() => {
        if (!isOpen || !client?.id) return;

        const fetchSummary = async () => {
            setLoadingReceivables(true);
            try {
                const res = await api.get(`/clients/${client.id}/receivables-summary`);
                setReceivablesSummary(res.data);
            } catch {
                setReceivablesSummary(null);
            } finally {
                setLoadingReceivables(false);
            }
        };
        fetchSummary();
    }, [isOpen, client?.id]);

    if (!isOpen || !client) return null;

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('es-VE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateString) => {
        return new Date(dateString).toLocaleString('es-VE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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

                {/* Badge de Desactivación */}
                {!client.isActive && client.deactivationNote && (
                    <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="flex items-start gap-3">
                            <FileText className="text-amber-600 mt-0.5" size={18} />
                            <div>
                                <p className="text-xs font-semibold text-amber-800 mb-1">Motivo de Desactivación</p>
                                <p className="text-sm text-amber-700">{client.deactivationNote}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Badge Cuentas por Cobrar Activas */}
                {!loadingReceivables && receivablesSummary?.activeCount > 0 && (
                    <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-red-100 rounded-lg">
                                <AlertCircle className="text-red-600" size={18} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-red-800">
                                    {receivablesSummary.activeCount === 1
                                        ? '1 cuenta por cobrar activa'
                                        : `${receivablesSummary.activeCount} cuentas por cobrar activas`}
                                </p>
                                <p className="text-xs text-red-600 mt-0.5">
                                    Saldo pendiente: <span className="font-bold">${Number(receivablesSummary.totalPendingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Badge Saldo a Favor */}
                {!loadingReceivables && receivablesSummary?.creditBalance > 0 && (
                    <div className="mx-6 mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-emerald-100 rounded-lg">
                                <Wallet className="text-emerald-600" size={18} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-emerald-800">Saldo a Favor</p>
                                <p className="text-xs text-emerald-600 mt-0.5">
                                    El cliente tiene un saldo a favor de <span className="font-bold">${Number(receivablesSummary.creditBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </p>
                                <p className="text-xs text-emerald-500 mt-0.5">
                                    Se aplicará automáticamente a su próxima cuenta por cobrar.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

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
                            <User size={14} /> Contacto
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
                            <div className="p-4 bg-slate-50 rounded-xl flex items-start gap-3 md:col-span-2">
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
                            {client.deliveryAddress && (
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <p className="text-xs text-slate-400 mb-1">Dirección de Entrega</p>
                                    <p className="font-medium text-slate-800">{client.deliveryAddress}</p>
                                </div>
                            )}
                            {client.referencePoint && (
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <p className="text-xs text-slate-400 mb-1">Punto de Referencia</p>
                                    <p className="font-medium text-slate-800">{client.referencePoint}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section: Detalles del Cliente */}
                    {client.clientDetails && (
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <FileText size={14} /> Detalles del Cliente
                            </h4>
                            <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{client.clientDetails}</p>
                            </div>
                        </div>
                    )}

                    {/* Section: Asignación y Fechas */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <UserCheck size={14} /> Asignación
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Solo ADMIN ve quiénes son los vendedores asignados */}
                            {user?.role !== 'SALES' && (
                                <div className="p-4 bg-slate-50 rounded-xl md:col-span-2">
                                    <p className="text-xs text-slate-400 mb-2">Vendedores Asignados</p>
                                    {client.assignedUsers && client.assignedUsers.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {client.assignedUsers.map(u => (
                                                <span key={u.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-sm font-medium">
                                                    <UserCheck size={13} />
                                                    {u.name}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="font-medium text-slate-500 italic text-sm">Sin asignar</p>
                                    )}
                                </div>
                            )}
                            <div className="p-4 bg-slate-50 rounded-xl flex items-start gap-3">
                                <Calendar className="text-slate-400 mt-0.5" size={18} />
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Fecha de Registro</p>
                                    <p className="font-medium text-slate-800">{formatDate(client.createdAt)}</p>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl flex items-start gap-3">
                                <Clock className="text-slate-400 mt-0.5" size={18} />
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Última actualización</p>
                                    <p className="font-medium text-slate-800">{formatDateTime(client.updatedAt)}</p>
                                    {client.updatedBy?.name && (
                                        <p className="text-xs text-slate-500 mt-1">por {client.updatedBy.name}</p>
                                    )}
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
