import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Activity, X, Loader2 } from 'lucide-react';

const STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Pendiente' },
    { value: 'AT_ORIGIN_WAREHOUSE', label: 'En Almacén Origen' },
    { value: 'AT_ORIGIN_PORT', label: 'En Puerto Origen' },
    { value: 'ON_VESSEL', label: 'En Tránsito' },
    { value: 'AT_DESTINATION_PORT', label: 'En Puerto Destino' },
    { value: 'CUSTOMS_CLEARANCE', label: 'En Aduana' },
    { value: 'DELIVERED', label: 'Entregado' },
];

const ChangeShipmentStatusModal = ({ isOpen, onClose, shipment, onUpdateStatus }) => {
    const [status, setStatus] = useState('PENDING');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (shipment?.status) setStatus(shipment.status);
    }, [shipment?.status, isOpen]);

    if (!isOpen || !shipment || typeof document === 'undefined') return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        await onUpdateStatus(shipment.id, status);
        setLoading(false);
    };

    const modal = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-slate-800">
                        <Activity className="text-sky-600" size={20} />
                        <h3 className="font-bold">Actualizar Estado</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="space-y-1 text-sm text-slate-500">
                        <p>Embarque: <span className="font-semibold text-slate-800">EMB-{String(shipment.number).padStart(5, '0')}</span></p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-700">Nuevo Estado</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-sm bg-slate-50"
                        >
                            {STATUS_OPTIONS.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                        <button type="submit" disabled={loading || status === shipment.status} className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors flex items-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed">
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            Actualizar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
};

export default ChangeShipmentStatusModal;
