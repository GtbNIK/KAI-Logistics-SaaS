import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Ship, DollarSign, Calendar, Plus, Loader2 } from 'lucide-react';
import Select from 'react-select';
import { useToast } from '../../context/ToastContext';
import rateService from '../../services/rate.service';
import allyService from '../../services/ally.service';
import portService from '../../services/port.service';
import countryService from '../../services/country.service';
import shippingLineService from '../../services/shippingLine.service';
import { useCanQuickCreate } from '../../hooks/useCanQuickCreate';
import { QUICK_CREATE_ALLOWED_ROLES } from '../../config/quickCreateRoles';
import QuickCreateShippingLineModal from '../shared/QuickCreateShippingLineModal';
import QuickCreateCountryModal from '../shared/QuickCreateCountryModal';

const selectStyles = {
    control: (base) => ({ ...base, borderRadius: '0.75rem', borderColor: '#e2e8f0', minHeight: '40px', '&:hover': { borderColor: '#3b82f6' } }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden' }),
};

const emptyForm = {
    region: 'CHINA',
    allyId: '',
    countryId: '',
    originPortIds: [],  // Array de IDs
    destinationPortIds: [],  // Array de IDs
    shippingLineId: '',
    cost20ft: '',
    cost40ft: '',
    bankFee: '',
    profitYaho: '',
    profitIS: '',
    freeDays: 21,
    validFrom: '',
    validUntil: ''
};

const CreateRateModal = ({ isOpen, onClose, onSuccess, editMode = false, entityData = null }) => {
    const { showSuccess, showError } = useToast();
    const canQuickCreateShippingLine = useCanQuickCreate(QUICK_CREATE_ALLOWED_ROLES.ShippingLine);
    const canQuickCreateCountry = useCanQuickCreate(QUICK_CREATE_ALLOWED_ROLES.Country);
    const [formData, setFormData] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    // Catálogos
    const [allies, setAllies] = useState([]);
    const [ports, setPorts] = useState([]);
    const [countries, setCountries] = useState([]);
    const [shippingLines, setShippingLines] = useState([]);

    // Quick create modals
    const [quickCreateOpen, setQuickCreateOpen] = useState(false);
    const [quickCreateType, setQuickCreateType] = useState(null);

    // Cargar catálogos al abrir
    useEffect(() => {
        if (!isOpen) return;

        const handleTenantChange = () => {
            if (!isOpen) return;
            setFormData(emptyForm);
            setSaving(false);
            setQuickCreateOpen(false);
            setQuickCreateType(null);
            loadCatalogs();
        };

        window.addEventListener('kai:tenant-changed', handleTenantChange);

        loadCatalogs();
        if (editMode && entityData) {
            setFormData({
                region: entityData.region || 'CHINA',
                allyId: entityData.allyId || '',
                countryId: entityData.countryId || '',
                originPortIds: entityData.originPortIds || [],
                destinationPortIds: entityData.destinationPortIds || [],
                shippingLineId: entityData.shippingLineId || '',
                cost20ft: entityData.cost20ft ?? '',
                cost40ft: entityData.cost40ft ?? '',
                bankFee: entityData.bankFee ?? '',
                profitYaho: entityData.profitYaho ?? '',
                profitIS: entityData.profitIS ?? '',
                freeDays: entityData.freeDays ?? 21,
                validFrom: entityData.validFrom ? entityData.validFrom.split('T')[0] : '',
                validUntil: entityData.validUntil ? entityData.validUntil.split('T')[0] : ''
            });
        } else {
            setFormData(emptyForm);
        }

        return () => window.removeEventListener('kai:tenant-changed', handleTenantChange);
    }, [isOpen, editMode, entityData]);

    const loadCatalogs = async () => {
        try {
            const [alliesData, portsData, countriesData, linesData] = await Promise.all([
                allyService.getAllies({ all: 'true' }),
                portService.getPorts({ all: 'true' }),
                countryService.getCountries(),
                shippingLineService.getShippingLines({ all: 'true' })
            ]);
            setAllies(alliesData.data || []);
            setPorts(portsData.data || []);
            setCountries(countriesData || []);
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

    const shippingLineOptions = useMemo(() => {
        const base = shippingLines.filter(l => l.isActive !== false).map(l => ({
            value: l.id, label: l.name
        }));
        if (canQuickCreateShippingLine) {
            return [...base, { value: 'NEW', label: 'Agregar nueva línea naviera', isAction: true }];
        }
        return base;
    }, [shippingLines, canQuickCreateShippingLine]);

    const countryOptions = useMemo(() => {
        const base = countries.map(c => ({
            value: c.id, label: c.name
        }));
        if (canQuickCreateCountry) {
            return [...base, { value: 'NEW', label: '+ Agregar nuevo país', isAction: true }];
        }
        return base;
    }, [countries, canQuickCreateCountry]);

    // Precios calculados
    const sale20HC = useMemo(() => {
        const cost = parseFloat(formData.cost20ft) || 0;
        if (!cost) return 0;
        const bank = parseFloat(formData.bankFee) || 0;
        const yaho = parseFloat(formData.profitYaho) || 0;
        const is_ = parseFloat(formData.profitIS) || 0;
        return cost + bank + yaho + is_;
    }, [formData.cost20ft, formData.bankFee, formData.profitYaho, formData.profitIS]);

    const sale40HC = useMemo(() => {
        const cost = parseFloat(formData.cost40ft) || 0;
        if (!cost) return 0;
        const bank = parseFloat(formData.bankFee) || 0;
        const yaho = parseFloat(formData.profitYaho) || 0;
        const is_ = parseFloat(formData.profitIS) || 0;
        return cost + bank + yaho + is_;
    }, [formData.cost40ft, formData.bankFee, formData.profitYaho, formData.profitIS]);

    const handleSelectChange = (field, option) => {
        if (option?.isAction) {
            if (field === 'countryId') {
                setQuickCreateType('country');
                setQuickCreateOpen(true);
            } else if (field === 'shippingLineId') {
                setQuickCreateType('shippingLine');
                setQuickCreateOpen(true);
            }
            return;
        }
        setFormData(prev => ({ ...prev, [field]: option?.value || '' }));
    };

    const handlePortCheckbox = (portId, field) => {
        setFormData(prev => {
            const currentIds = prev[field] || [];
            const newIds = currentIds.includes(portId)
                ? currentIds.filter(id => id !== portId)
                : [...currentIds, portId];
            return { ...prev, [field]: newIds };
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validaciones
        if (!formData.allyId) {
            showError('Campos requeridos', 'Selecciona un aliado');
            return;
        }
        if (!formData.originPortIds || formData.originPortIds.length === 0) {
            showError('Campos requeridos', 'Selecciona al menos un puerto de origen');
            return;
        }
        if (!formData.destinationPortIds || formData.destinationPortIds.length === 0) {
            showError('Campos requeridos', 'Selecciona al menos un puerto de destino');
            return;
        }
        if (formData.region === 'OTHER' && !formData.countryId) {
            showError('Campos requeridos', 'El país es obligatorio para tarifas de "Otros Países"');
            return;
        }

        if (!formData.validFrom) {
            showError('Campos requeridos', 'Selecciona una fecha de inicio de validez');
            return;
        }
        if (!formData.validUntil) {
            showError('Campos requeridos', 'Selecciona una fecha de fin de validez');
            return;
        }
        if (new Date(formData.validUntil) <= new Date(formData.validFrom)) {
            showError('Rango inválido', 'La fecha fin debe ser posterior a la fecha inicio');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                region: formData.region,
                allyId: formData.allyId,
                originPortIds: formData.originPortIds,
                destinationPortIds: formData.destinationPortIds,
                cost20ft: parseFloat(formData.cost20ft) || 0,
                cost40ft: parseFloat(formData.cost40ft) || 0,
                freeDays: parseInt(formData.freeDays) || 21,
                validFrom: formData.validFrom || undefined,
                validUntil: formData.validUntil,
                shippingLineId: formData.shippingLineId || undefined
            };

            // Agregar país si es OTHER
            if (formData.region === 'OTHER') {
                payload.countryId = formData.countryId;
            }

            // Agregar fees y profits solo si es CHINA o si tienen valor
            if (formData.region === 'CHINA') {
                payload.bankFee = parseFloat(formData.bankFee) || 0;
                payload.profitYaho = parseFloat(formData.profitYaho) || 0;
                payload.profitIS = parseFloat(formData.profitIS) || 0;
            } else if (formData.bankFee || formData.profitYaho || formData.profitIS) {
                // Para OTHER, solo enviar si tienen valor
                if (formData.bankFee) payload.bankFee = parseFloat(formData.bankFee);
                if (formData.profitYaho) payload.profitYaho = parseFloat(formData.profitYaho);
                if (formData.profitIS) payload.profitIS = parseFloat(formData.profitIS);
            }

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
            <QuickCreateShippingLineModal
                isOpen={quickCreateOpen && quickCreateType === 'shippingLine'}
                onClose={() => setQuickCreateOpen(false)}
                onSuccess={() => {
                    setQuickCreateOpen(false);
                    loadCatalogs();
                }}
            />
            <QuickCreateCountryModal
                isOpen={quickCreateOpen && quickCreateType === 'country'}
                onClose={() => setQuickCreateOpen(false)}
                onSuccess={(newCountry) => {
                    setQuickCreateOpen(false);
                    loadCatalogs();
                    setFormData(prev => ({ ...prev, countryId: newCountry.id }));
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
                                    {editMode ? 'Editar Tarifa' : `Nueva Tarifa ${formData.region === 'CHINA' ? 'China' : 'Otros Países'}`}
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
                                {/* Región */}
                                <div>
                                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                                        Región <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        name="region"
                                        value={formData.region}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all"
                                    >
                                        <option value="CHINA">China</option>
                                        <option value="OTHER">Otros Países</option>
                                    </select>
                                </div>

                                {/* País (solo si region es OTHER) */}
                                {formData.region === 'OTHER' && (
                                    <div>
                                        <label className="text-sm font-medium text-slate-700 mb-1 block">
                                            País <span className="text-red-500">*</span>
                                        </label>
                                        <Select
                                            options={countryOptions}
                                            value={countryOptions.find(o => o.value === formData.countryId) || null}
                                            onChange={(opt) => handleSelectChange('countryId', opt)}
                                            placeholder="Seleccionar país..."
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
                                )}

                                {/* Aliado */}
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

                                {/* Línea Naviera */}
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
                            </div>

                            {/* Puertos de Origen (Checkboxes) */}
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-2 block">
                                    Puertos de Origen <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                    {ports.filter(p => p.isActive !== false).map(port => (
                                        <label key={port.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-2 rounded-lg transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={formData.originPortIds.includes(port.id)}
                                                onChange={() => handlePortCheckbox(port.id, 'originPortIds')}
                                                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-slate-700">{port.name} ({port.code})</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Puertos de Destino (Checkboxes) */}
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-2 block">
                                    Puertos de Destino <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                    {ports.filter(p => p.isActive !== false).map(port => (
                                        <label key={port.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-2 rounded-lg transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={formData.destinationPortIds.includes(port.id)}
                                                onChange={() => handlePortCheckbox(port.id, 'destinationPortIds')}
                                                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-slate-700">{port.name} ({port.code})</span>
                                        </label>
                                    ))}
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
                        {(formData.region === 'CHINA' || formData.region === 'OTHER') && (
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <DollarSign size={14} /> Fees y Márgenes de Ganancia
                                </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Bank Fee visible para todas las regiones */}
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
                                {/* Profit Yaho solo para CHINA */}
                                {formData.region === 'CHINA' && (
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
                                )}
                                {/* Profit IS visible para todas las regiones */}
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

                            {/* Precios de venta calculados (para ambas regiones) */}
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
                        )}

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
                                        Válida desde <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date" name="validFrom"
                                        value={formData.validFrom}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                                        Válida hasta <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date" name="validUntil"
                                        value={formData.validUntil}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all"
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
