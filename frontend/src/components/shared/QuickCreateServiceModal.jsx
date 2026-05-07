import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Loader2, Package } from 'lucide-react';
import serviceService from '../../services/service.service';
import { useToast } from '../../context/ToastContext';

const QuickCreateServiceModal = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const { showSuccess, showError } = useToast();
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        type: 'OTHER',
        notes: ''
    });

    const serviceTypes = [
        { value: 'DOOR_TO_DOOR', label: 'Puerta a Puerta' },
        { value: 'FCL_20', label: 'Contenedor 20\'' },
        { value: 'FCL_40', label: 'Contenedor 40\'' },
        { value: 'FCL_40HC', label: 'Contenedor 40\' HC' },
        { value: 'LCL', label: 'Carga Suelta (LCL)' },
        { value: 'AIR', label: 'Aéreo' },
        { value: 'WAREHOUSE', label: 'Almacenaje' },
        { value: 'CUSTOMS', label: 'Aduana' },
        { value: 'OTHER', label: 'Otro' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await serviceService.createService(formData);
            showSuccess('¡Éxito!', 'Servicio creado correctamente');
            onSuccess({ value: result.id, label: result.name, data: result });
            onClose();
        } catch (error) {
            console.error('Error creating service:', error);
            showError('Error', error.response?.data?.message || 'No se pudo crear el servicio');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || typeof document === 'undefined') return null;

    const modal = (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Package size={18} className="text-primary" />
                        Nuevo Servicio
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={18} className="text-slate-400" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Código</label>
                            <input
                                required
                                type="text"
                                value={formData.code}
                                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                                placeholder="Ejem: FCL20"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Tipo</label>
                            <select
                                required
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                            >
                                {serviceTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nombre</label>
                        <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                            placeholder="Nombre descriptivo del servicio"
                        />
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium transition-colors text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/25 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
};

export default QuickCreateServiceModal;
