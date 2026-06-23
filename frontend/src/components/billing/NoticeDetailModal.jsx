import { createPortal } from 'react-dom';
import { Receipt, DollarSign, Package, FileText, User, Calendar, X, ScrollText, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const NoticeDetailModal = ({ notice, onClose, user }) => {
    const [loading, setLoading] = useState(true);
    const [fullNotice, setFullNotice] = useState(null);

    useEffect(() => {
        const loadNotice = async () => {
            try {
                const response = await axios.get(`${API_URL}/payment-notices/${notice.id}`);
                setFullNotice(response.data);
            } catch (error) {
                console.error('Error loading notice:', error);
            } finally {
                setLoading(false);
            }
        };
        loadNotice();
    }, [notice.id]);

    if (!notice) return null;
    const n = fullNotice || notice;

    if (loading) {
        return createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-8 flex items-center gap-3">
                    <Loader2 className="animate-spin text-primary" />
                    <span>Cargando aviso de cobro...</span>
                </div>
            </div>,
            document.body
        );
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] transform transition-all animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Receipt className="text-primary" size={22} />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800 text-xl">
                                AVC-{String(n.number).padStart(5, '0')}
                            </h2>
                            <p className="text-slate-500 text-sm">Aviso de Cobro</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-xl p-4 space-y-1">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <User size={12} /> Cliente
                            </p>
                            <p className="font-semibold text-slate-800">{n.client?.name || 'N/A'}</p>
                            {n.client?.rifOrId && (
                                <p className="text-xs text-slate-400">{n.client.rifOrId}</p>
                            )}
                            {n.client?.address && (
                                <p className="text-xs text-slate-400 break-words whitespace-pre-line">
                                    Dirección: {n.client.address}
                                </p>
                            )}
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 space-y-1">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <Calendar size={12} /> Fecha de Emisión
                            </p>
                            <p className="font-semibold text-slate-800">
                                {new Date(n.issueDate || n.createdAt).toLocaleDateString('es-VE')}
                            </p>
                        </div>
                    </div>

                    {/* Sección Origen */}
                    {(n.quote || n.receivable) && (
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                                <FileText size={12} /> Origen
                            </h3>
                            <div className="space-y-2">
                                {n.quote && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-slate-500">Viene de la Cotización:</span>
                                        <span className="px-2 py-0.5 text-xs font-bold rounded-md border bg-blue-50 text-blue-600 border-blue-200">
                                            COT-{String(n.quote.number).padStart(5, '0')}
                                        </span>
                                    </div>
                                )}
                                {n.receivable && user?.role === 'ADMIN' && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-slate-500">Cuenta por cobrar asociada:</span>
                                        <span className="px-2 py-0.5 text-xs font-bold rounded-md border bg-purple-50 text-purple-600 border-purple-200">
                                            CXC-{String(n.receivable.number).padStart(5, '0')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <Package size={16} className="text-primary" /> Servicios Cobrados
                        </h3>
                        {(!n.items || n.items.length === 0) ? (
                            <div className="flex flex-col items-center py-8 text-slate-400 bg-slate-50 rounded-xl">
                                <Package size={28} className="opacity-30 mb-2" />
                                <p className="text-sm">Sin items registrados</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {n.items.map((item, i) => {
                                    const parts = (item.description || '').split(' · ');
                                    const serviceName = parts[0] || 'Servicio';
                                    const isLogistics = ['FCL_20', 'FCL_40', 'FCL_40HC', 'LCL', 'DOOR_TO_DOOR'].includes(item.service?.type);
                                    const isAir = item.service?.type === 'AIR';
                                    const extraParts = parts.slice(1).filter(p => !p.startsWith('Aliado:') && !p.startsWith('Línea Naviera:') && !p.startsWith('Línea Aérea:'));
                                    return (
                                        <div key={i} className="bg-slate-50 rounded-xl p-4 flex justify-between items-start border border-slate-100">
                                            <div className="space-y-1">
                                                <p className="font-medium text-slate-800">{serviceName}</p>
                                                <div className="text-sm text-slate-500 flex flex-col gap-0.5">
                                                    {item.ally && (
                                                        <p className="flex items-center gap-1">
                                                            <span className="font-medium text-slate-600">Aliado:</span>
                                                            {item.ally.name}
                                                        </p>
                                                    )}

                                                    {/* Línea Naviera o Aérea */}
                                                    {isLogistics && item.shippingLine && (
                                                        <p className="flex items-center gap-1">
                                                            <span className="font-medium text-slate-600">Línea Naviera:</span>
                                                            {item.shippingLine.name}
                                                        </p>
                                                    )}
                                                    {isAir && item.airLine && (
                                                        <p className="flex items-center gap-1">
                                                            <span className="font-medium text-slate-600">Línea Aérea:</span>
                                                            {item.airLine.name}
                                                        </p>
                                                    )}

                                                    {extraParts.map((part, j) => (
                                                        <p key={j} className="flex items-center gap-1">
                                                            <span className="font-medium text-slate-600">{part.split(': ')[0]}:</span>{' '}
                                                            {part.split(': ').slice(1).join(': ')}
                                                        </p>
                                                    ))}
                                                    <p className="text-slate-400 text-xs mt-1 italic">
                                                        {parseFloat(item.quantity)} {serviceName.toLowerCase().includes('door') ? 'CBM' : 'unidades'} @ ${parseFloat(item.unitPrice || 0).toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="font-bold text-slate-700 whitespace-nowrap ml-4">
                                                ${parseFloat(item.totalPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {n.notes && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                            <p className="text-xs font-medium text-amber-600 mb-1">Notas</p>
                            <p className="text-sm text-slate-700">{n.notes}</p>
                        </div>
                    )}
                </div>

                {/* Footer total */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-800 text-white flex items-center justify-between rounded-b-2xl">
                    <span className="text-sm font-medium flex items-center gap-2">
                        <DollarSign size={16} /> Total del Aviso
                    </span>
                    <span className="text-2xl font-bold">
                        ${parseFloat(n.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default NoticeDetailModal;
