import { useState, useEffect, useMemo } from 'react';
import { X, Save, DollarSign, Calculator } from 'lucide-react';
import Select from 'react-select';
import { useToast } from '../../context/ToastContext';
import allyService from '../../services/ally.service';
import portService from '../../services/port.service';
import shippingLineService from '../../services/shippingLine.service';
import rateService from '../../services/rate.service';

const RateFormModal = ({ isOpen, onClose, onSuccess, editMode = false, rateData = null, region = 'CHINA' }) => {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [loadingCatalogs, setLoadingCatalogs] = useState(true);
    
    // Catálogos
    const [allies, setAllies] = useState([]);
    const [ports, setPorts] = useState([]);
    const [shippingLines, setShippingLines] = useState([]);
    
    // Form data
    const [formData, setFormData] = useState({
        region: region,
        allyId: '',
        originPortId: '',
        destinationPortId: '',
        cost20ft: '',
        cost40ft: '',
        bankFee: '',
        profitYaho: '',
        profitIS: '',
        shippingLineId: '',
        freeDays: 21,
        validUntil: '',
        observations: ''
    });

    // Cargar catálogos
    useEffect(() => {
        if (isOpen) {
            loadCatalogs();
        }
    }, [isOpen]);

    // Inicializar form data
    useEffect(() => {
        if (isOpen) {
            if (editMode && rateData) {
                setFormData({
                    region: rateData.region || region,
                    allyId: rateData.ally?.id || '',
                    originPortId: rateData.originPort?.id || '',
                    destinationPortId: rateData.destinationPort?.id || '',
                    cost20ft: rateData.cost20ft || '',
                    cost40ft: rateData.cost40ft || '',
                    bankFee: rateData.bankFee || '',
                    profitYaho: rateData.profitYaho || '',
                    profitIS: rateData.profitIS || '',
                    shippingLineId: rateData.shippingLine?.id || '',
                    freeDays: rateData.freeDays || 21,
                    validUntil: rateData.validUntil ? rateData.validUntil.split('T')[0] : '',
                    observations: rateData.observations || ''
                });
            } else {
                setFormData({
                    region: region,
                    allyId: '',
                    originPortId: '',
                    destinationPortId: '',
                    cost20ft: '',
                    cost40ft: '',
                    bankFee: '',
                    profitYaho: '',
                    profitIS: '',
                    shippingLineId: '',
                    freeDays: 21,
                    validUntil: '',
                    observations: ''
                });
            }
        }
    }, [isOpen, editMode, rateData, region]);

    const loadCatalogs = async () => {
        setLoadingCatalogs(true);
        try {
            const [alliesRes, portsRes, shippingLinesRes] = await Promise.all([
                allyService.getAllies({ all: 'true' }),
                portService.getPorts({ all: 'true' }),
                shippingLineService.getShippingLines({ all: 'true' })
            ]);

            setAllies((alliesRes.data || []).filter(a => a.isActive).map(a => ({ 
                value: a.id, 
                label: `${a.name} (${a.internalCode})` 
            })));
            
            setPorts((portsRes.data || []).filter(p => p.isActive).map(p => ({ 
                value: p.id, 
                label: `${p.name} (${p.code})` 
            })));
            
            setShippingLines((shippingLinesRes.data || []).filter(s => s.isActive).map(s => ({ 
                value: s.id, 
                label: s.name 
            })));
        } catch (error) {
            console.error('Error loading catalogs:', error);
            toast.showError('Error', 'No se pudieron cargar los catálogos');
        } finally {
            setLoadingCatalogs(false);
        }
    };

    // Cálculo en tiempo real de precios de venta
    const calculatedPrices = useMemo(() => {
        const cost20 = parseFloat(formData.cost20ft) || 0;
        const cost40 = parseFloat(formData.cost40ft) || 0;
        const bank = parseFloat(formData.bankFee) || 0;
        const yaho = parseFloat(formData.profitYaho) || 0;
        const is = parseFloat(formData.profitIS) || 0;

        return {
            sale20HC: (cost20 + bank + yaho + is).toFixed(2),
            sale40HC: (cost40 + bank + yaho + is).toFixed(2)
        };
    }, [formData.cost20ft, formData.cost40ft, formData.bankFee, formData.profitYaho, formData.profitIS]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, selectedOption) => {
        setFormData(prev => ({ ...prev, [name]: selectedOption?.value || '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validaciones
        if (!formData.allyId || !formData.originPortId || !formData.destinationPortId) {
            toast.showError('Campos requeridos', 'Debes seleccionar aliado, puerto de origen y destino');
            return;
        }

        if (formData.originPortId === formData.destinationPortId) {
            toast.showError('Error', 'El puerto de origen debe ser diferente al puerto de destino');
            return;
        }

        const numericFields = ['cost20ft', 'cost40ft', 'bankFee', 'profitYaho', 'profitIS'];
        for (const field of numericFields) {
            if (!formData[field] || parseFloat(formData[field]) < 0) {
                toast.showError('Error', `El campo ${field} debe ser un número mayor o igual a 0`);
                return;
            }
        }

        if (!formData.validUntil) {
            toast.showError('Error', 'Debes seleccionar una fecha de validez');
            return;
        }

        const validUntilDate = new Date(formData.validUntil);
        if (validUntilDate <= new Date()) {
            toast.showError('Error', 'La fecha de validez debe ser futura');
            return;
        }

        setLoading(true);
        try {
            if (editMode && rateData) {
                await rateService.updateRate(rateData.id, formData);
                toast.entityUpdated('Tarifa');
            } else {
                await rateService.createRate(formData);
                toast.entityCreated('Tarifa');
            }
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Error saving rate:', error);
            toast.showError('Error', error.response?.data?.message || 'Error al guardar tarifa');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <DollarSign className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">
                                {editMode ? 'Editar Tarifa' : 'Nueva Tarifa'}
                            </h2>
                            <p className="text-sm text-slate-500">
                                Región: {region === 'CHINA' ? 'China' : 'Otros Países'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                    {loadingCatalogs ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Sección: Información General */}
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h3 className="font-semibold text-slate-700 mb-4">Información General</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Aliado */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Aliado <span className="text-red-500">*</span>
                                        </label>
                                        <Select
                                            options={allies}
                                            value={allies.find(a => a.value === formData.allyId)}
                                            onChange={(opt) => handleSelectChange('allyId', opt)}
                                            placeholder="Seleccionar aliado..."
                                            className="text-sm"
                                            isDisabled={loading}
                                        />
                                    </div>

                                    {/* Línea Naviera */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Línea Naviera
                                        </label>
                                        <Select
                                            options={shippingLines}
                                            value={shippingLines.find(s => s.value === formData.shippingLineId)}
                                            onChange={(opt) => handleSelectChange('shippingLineId', opt)}
                                            placeholder="Seleccionar línea..."
                                            className="text-sm"
                                            isClearable
                                            isDisabled={loading}
                                        />
                                    </div>

                                    {/* Puerto Origen */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Puerto de Salida <span className="text-red-500">*</span>
                                        </label>
                                        <Select
                                            options={ports}
                                            value={ports.find(p => p.value === formData.originPortId)}
                                            onChange={(opt) => handleSelectChange('originPortId', opt)}
                                            placeholder="Seleccionar puerto..."
                                            className="text-sm"
                                            isDisabled={loading}
                                        />
                                    </div>

                                    {/* Puerto Destino */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Puerto de Llegada <span className="text-red-500">*</span>
                                        </label>
                                        <Select
                                            options={ports}
                                            value={ports.find(p => p.value === formData.destinationPortId)}
                                            onChange={(opt) => handleSelectChange('destinationPortId', opt)}
                                            placeholder="Seleccionar puerto..."
                                            className="text-sm"
                                            isDisabled={loading}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Sección: Costos y Precios */}
                            <div className="bg-amber-50 rounded-xl p-4">
                                <h3 className="font-semibold text-slate-700 mb-4">Costos de Contenedores</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Costo 20ft (USD) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            name="cost20ft"
                                            value={formData.cost20ft}
                                            onChange={handleChange}
                                            step="0.01"
                                            min="0"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            disabled={loading}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Costo 40ft (USD) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            name="cost40ft"
                                            value={formData.cost40ft}
                                            onChange={handleChange}
                                            step="0.01"
                                            min="0"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            disabled={loading}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Sección: Fees y Profits */}
                            <div className="bg-green-50 rounded-xl p-4">
                                <h3 className="font-semibold text-slate-700 mb-4">Fees y Márgenes de Ganancia</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Bank Fee (USD) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            name="bankFee"
                                            value={formData.bankFee}
                                            onChange={handleChange}
                                            step="0.01"
                                            min="0"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            disabled={loading}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Profit Yaho (USD) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            name="profitYaho"
                                            value={formData.profitYaho}
                                            onChange={handleChange}
                                            step="0.01"
                                            min="0"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            disabled={loading}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Profit IS (USD) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            name="profitIS"
                                            value={formData.profitIS}
                                            onChange={handleChange}
                                            step="0.01"
                                            min="0"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            disabled={loading}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Sección: Precios de Venta Calculados */}
                            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                                <div className="flex items-center gap-2 mb-4">
                                    <Calculator className="text-blue-600" size={18} />
                                    <h3 className="font-semibold text-slate-700">Precios de Venta (Calculados)</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                                        <p className="text-xs text-slate-500 mb-1">Venta 20HC</p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            ${calculatedPrices.sale20HC}
                                        </p>
                                    </div>

                                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                                        <p className="text-xs text-slate-500 mb-1">Venta 40HC</p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            ${calculatedPrices.sale40HC}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Sección: Detalles Adicionales */}
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h3 className="font-semibold text-slate-700 mb-4">Detalles Adicionales</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Días Libres
                                        </label>
                                        <input
                                            type="number"
                                            name="freeDays"
                                            value={formData.freeDays}
                                            onChange={handleChange}
                                            min="0"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            disabled={loading}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Validez <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            name="validUntil"
                                            value={formData.validUntil}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            disabled={loading}
                                            required
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Observaciones
                                        </label>
                                        <textarea
                                            name="observations"
                                            value={formData.observations}
                                            onChange={handleChange}
                                            rows="3"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                                            disabled={loading}
                                            placeholder="Notas adicionales sobre esta tarifa..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors text-sm font-medium"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={loading || loadingCatalogs}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                {editMode ? 'Actualizar' : 'Crear'} Tarifa
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RateFormModal;
