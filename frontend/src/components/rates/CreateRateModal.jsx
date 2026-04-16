import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Ship, DollarSign, Calendar, Plus, Loader2 } from 'lucide-react';
import Select from 'react-select';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import rateService from '../../services/rate.service';
import allyService from '../../services/ally.service';
import portService from '../../services/port.service';
import shippingLineService from '../../services/shippingLine.service';
import QuickCreatePortModal from '../shared/QuickCreatePortModal';
import QuickCreateShippingLineModal from '../shared/QuickCreateShippingLineModal';

const selectStyles = {
    control: (base) => ({ ...base, borderRadius: '0.75rem', borderColor: '#e2e8f0', minHeight: '40px', '&:hover': { borderColor: '#3b82f6' } }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden' }),
};

const emptyForm = {
    allyId: '',
    originPortId: '',
    destinationPortId: '',
    shippingLineId: '',
    cost20ft: '',
    cost40ft: '',
    bankFee: '',
    profitYaho: '',
    profitIS: '',
    freeDays: 21,
    validUntil: '',
    observations: '',
    region: 'CHINA'
};

const CreateRateModal = ({ isOpen, onClose, onSuccess, editMode = false, entityData = null }) => {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const [formData, setFormData] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    // Catálogos
    const [allies, setAllies] = useState([]);
    const [ports, setPorts] = useState([]);
    const [shippingLines, setShippingLines] = useState([]);

    // Quick create modals
    const [quickCreateOpen, setQuickCreateOpen] = useState(false);
    const [quickCreateType, setQuickCreateType] = useState(null);

    // Cargar catálogos al abrir
    useEffect(() => {
        if (!isOpen) return;
        loadCatalogs();
        if (editMode && entityData) {
            setFormData({
                allyId: entityData.allyId || '',
                originPortId: entityData.originPortId || '',
                destinationPortId: entityData.destinationPortId || '',
                shippingLineId: entityData.shippingLineId || '',
                cost20ft: entityData.cost20ft || '',
                cost40ft: entityData.cost40ft || '',
                bankFee: entityData.bankFee || '',
                profitYaho: entityData.profitYaho || '',
                profitIS: entityData.profitIS || '',
                freeDays: entityData.freeDays ?? 21,
                validUntil: entityData.validUntil ? entityData.validUntil.split('T')[0] : '',
                observations: entityData.observations || '',
                region: entityData.region || 'CHINA'
            });
        } else {
            setFormData(emptyForm);
        }
    }, [isOpen, editMode, entityData]);

    const loadCatalogs = async () => {
        try {
            const [alliesData, portsData, linesData] = await Promise.all([
                allyService.getAllies({ all: 'true' }),
                portService.getPorts({ all: 'true' }),
                shippingLineService.getShippingLines({ all: 'true' })
            ]);
            setAllies(alliesData.data || []);
            setPorts(portsData.data || []);
            setShippingLines(linesData.data || []);
        } catch (error) {
            console.error('Error loading catalogs:', error);
        }
    };

    // Opciones para react-select
    const allyOptions = useMemo(() =>
        allies.filter(a => a.isActive !== false).map(a => ({
            value: a.id, label: `${a.name} (${a.internalCode})`
        })),
        [allies]
    );

    const portOptions = useMemo(() => {
        const base = ports.filter(p => p.isActive !== false).map(p => ({
            value: p.id, label: `${p.name} (${p.code})`
        }));
        if (user?.role === 'ADMIN') {
            return [...base, { value: 'NEW', label: 'Agregar nuevo puerto', isAction: true }];
        }
        return base;
    }, [ports, user]);

    const shippingLineOptions = useMemo(() => {
        const base = shippingLines.filter(l => l.isActive !== false).map(l => ({
            value: l.id, label: l.name
        }));
        if (user?.role === 'ADMIN') {
            return [...base, { value: 'NEW', label: 'Agregar nueva línea naviera', isAction: true }];
        }
        return base;
    }, [shippingLines, user]);

    // Precios calculados
    const sale20HC = useMemo(() => {
        const cost = parseFloat(formData.cost20ft) || 0;
        const bank = parseFloat(formData.bankFee) || 0;
        const yaho = parseFloat(formData.profitYaho) || 0;
        const is_ = parseFloat(formData.profitIS) || 0;
        return cost + bank + yaho + is_;
    }, [formData.cost20ft, formData.bankFee, formData.profitYaho, formData.profitIS]);

    const sale40HC = useMemo(() => {
        const cost = parseFloat(formData.cost40ft) || 0;
        const bank = parseFloat(formData.bankFee) || 0;
        const yaho = parseFloat(formData.profitYaho) || 0;
        const is_ = parseFloat(formData.profitIS) || 0;
        return cost + bank + yaho + is_;
    }, [formData.cost40ft, formData.bankFee, formData.profitYaho, formData.profitIS]);

    const handleSelectChange = (field, option) => {
        if (option?.isAction) {
            if (field === 'originPortId' || field === 'destinationPortId') {
                setQuickCreateType('port');
                setQuickCreateOpen(true);
            } else if (field === 'shippingLineId') {
                setQuickCreateType('shippingLine');
                setQuickCreateOpen(true);
            }
            return;
        }
        setFormData(prev => ({ ...prev, [field]: option?.value || '' }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.allyId || !formData.originPortId || !formData.destinationPortId) {
            showError('Campos requeridos', 'Selecciona aliado, puerto de salida y llegada');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                sale20HC,
                sale40HC,
                cost20ft: parseFloat(formData.cost20ft) || 0,
                cost40ft: parseFloat(formData.cost40ft) || 0,
                bankFee: parseFloat(formData.bankFee) || 0,
                profitYaho: parseFloat(formData.profitYaho) || 0,
                profitIS: parseFloat(formData.profitIS) || 0,
                freeDays: parseInt(formData.freeDays) || 0,
            };

            if (editMode && entityData) {
                await rateService.updateRate(entityData.id, payload);
                showSuccess('Tarifa actualizada', 'Los cambios se guardaron correctamente');
            } else {
                await rateService.createRate(payload);
                showSuccess('Tarifa creada', 'La tarifa se registró exitosamente');
            }
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Error saving rate:', error);
            showError('Error', error.response?.data?.message || `Error al ${editMode ? 'actualizar' : 'crear'} la tarifa`);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <>
            <QuickCreatePortModal
                isOpen={quickCreateOpen && quickCreateType === 'port'}
                onClose={() => setQuickCreateOpen(false)}
                onSuccess={() => {
                    setQuickCreateOpen(false);
                    loadCatalogs();
                }}
            />
            <QuickCreateShippingLineModal
                isOpen={quickCreateOpen && quickCreateType === 'shippingLine'}
                onClose={() => setQuickCreateOpen(false)}
                onSuccess={() => {
                    setQuickCreateOpen(false);
                    loadCatalogs();
                }}
            />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-50 rounded-xl">
                                <DollarSign className="text-red-600" size={22} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">
                                    {editMode ? 'Editar Tarifa' : 'Nueva Tarifa China'}
                                </h3>
                                <p className="text-sm text-slate-500">
                                    {editMode ? 'Actualizar información de la tarifa' : 'Registrar nueva tarifa de importación'}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
                        
                        {/* Sección: Información General */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Ship size={14} /> Información General
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                                        Aliado <span className="text-red-500">*</span>
                                    </label>
                                    <Select
                                        options={allyOptions}
                                        value={allyOptions.find(o => o.value === formData.allyId) || null}
                                        onChange={(opt) => handleSelectChange('allyId', opt)}
                                        placeholder="Seleccionar aliado..."
                                        isClearable
                                        styles={selectStyles}
                                        menuPortalTarget={document.body}
                                        menuPosition="fixed"
                                        noOptionsMessage={() => 'Sin resultados'}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                                        Línea Naviera
                                    </label>
                                    <Select
                                        options={shippingLineOptions}
                                        value={shippingLineOptions.find(o => o.value === formData.shippingLineId) || null}
                                        onChange={(opt) => handleSelectChange('shippingLineId', opt)}
                                        placeholder="Seleccionar línea naviera..."
                                        isClearable
                                        styles={selectStyles}
                                        menuPortalTarget={document.body}
                                        menuPosition="fixed"
                                        noOptionsMessage={() => 'Sin resultados'}
                                        formatOptionLabel={(opt) => opt.isAction
                                            ? <span className="text-blue-600 font-medium flex items-center gap-1"><Plus size={14} />{opt.label}</span>
                                            : opt.label
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                                        Puerto de Salida <span className="text-red-500">*</span>
                                    </label>
                                    <Select
                                        options={portOptions}
                                        value={portOptions.find(o => o.value === formData.originPortId) || null}
                                        onChange={(opt) => handleSelectChange('originPortId', opt)}
                                        placeholder="Seleccionar puerto de salida..."
                                        isClearable
                                        styles={selectStyles}
                                        menuPortalTarget={document.body}
                                        menuPosition="fixed"
                                        noOptionsMessage={() => 'Sin resultados'}
                                        formatOptionLabel={(opt) => opt.isAction
                                            ? <span className="text-blue-600 font-medium flex items-center gap-1"><Plus size={14} />{opt.label}</span>
                                            : opt.label
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                                        Puerto de Llegada <span className="text-red-500">*</span>
                                    </label>
                                    <Select
                                        options={portOptions}
                                        value={portOptions.find(o => o.value === formData.destinationPortId) || null}
                                        onChange={(opt) => handleSelectChange('destinationPortId', opt)}
                                        placeholder="Seleccionar puerto de llegada..."
                                        isClearable
                                        styles={selectStyles}
                                        menuPortalTarget={document.body}
                                        menuPosition="fixed"
                                        noOptionsMessage={() => 'Sin resultados'}
                                        formatOptionLabel={(opt) => opt.isAction
                                            ? <span className="text-blue-600 font-medium flex items-center gap-1"><Plus size={14} />{opt.label}</span>
                                            : opt.label
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sección: Costos de Contenedores */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <DollarSign size={14} /> Costos de Contenedores
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                                        Costo 20ft (USD) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number" step="0.01" min="0" name="cost20ft"
                                        value={formData.cost20ft}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                                        Costo 40ft (USD) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number" step="0.01" min="0" name="cost40ft"
                                        value={formData.cost40ft}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sección: Fees y Márgenes */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <DollarSign size={14} /> Fees y Márgenes de Ganancia
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-700 mb-1 block">Bank Fee (USD)</label>
                                    <input
                                        type="number" step="0.01" min="0" name="bankFee"
                                        value={formData.bankFee}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700 mb-1 block">Profit Yaho (USD)</label>
                                    <input
                                        type="number" step="0.01" min="0" name="profitYaho"
                                        value={formData.profitYaho}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700 mb-1 block">Profit IS (USD)</label>
                                    <input
                                        type="number" step="0.01" min="0" name="profitIS"
                                        value={formData.profitIS}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all"
                                    />
                                </div>
                            </div>

                            {/* Precios de venta calculados */}
                            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                                <h5 className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-3">Precio de Venta Calculado</h5>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center">
                                        <p className="text-xs text-green-600 mb-1">Venta 20HC</p>
                                        <p className="text-2xl font-bold text-green-700">${sale20HC.toFixed(2)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-green-600 mb-1">Venta 40HC</p>
                                        <p className="text-2xl font-bold text-green-700">${sale40HC.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sección: Detalles Adicionales */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Calendar size={14} /> Detalles Adicionales
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-700 mb-1 block">Días Libres</label>
                                    <input
                                        type="number" min="0" name="freeDays"
                                        value={formData.freeDays}
                                        onChange={handleChange}
                                        placeholder="21"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                                        Validez <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date" name="validUntil"
                                        value={formData.validUntil}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-sm font-medium text-slate-700 mb-1 block">Observaciones</label>
                                    <textarea
                                        name="observations"
                                        value={formData.observations}
                                        onChange={handleChange}
                                        rows={3}
                                        placeholder="Notas adicionales sobre esta tarifa... (saldrán luego en el PDF)"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            className="inline-flex items-center gap-2 bg-primary-dark hover:bg-primary text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    {editMode ? 'Guardando...' : 'Creando...'}
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    {editMode ? 'Guardar Cambios' : 'Crear Tarifa'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
};

export default CreateRateModal;
