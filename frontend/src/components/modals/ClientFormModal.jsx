import { useState, useEffect } from 'react';
import { X, Save, User, FileText, Mail, Phone, MapPin, Building } from 'lucide-react';
import clientService from '../../services/client.service';
import { useAuth } from '../../context/AuthContext';

const ClientFormModal = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        rifOrId: '',
        email: '',
        phone: '',
        contactPerson: '',
        address: '',
        deliveryAddress: '',
        referencePoint: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: '',
                rifOrId: '',
                email: '',
                phone: '',
                contactPerson: '',
                address: '',
                deliveryAddress: '',
                referencePoint: ''
            });
            setError('');
        }
    }, [isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await clientService.createClient(formData);
            onSuccess(); // Refresh list via parent
            onClose();
        } catch (err) {
            console.error("Error creating client:", err);
            setError(err.response?.data?.message || 'Error al crear el cliente');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 sticky top-0 backdrop-blur-md z-10">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Nuevo Cliente</h3>
                        <p className="text-sm text-slate-500">Registrar un nuevo cliente o prospecto</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-center gap-2">
                            <X size={16} /> {error}
                        </div>
                    )}

                    {/* Section: Identificación */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Building size={14} /> Información Comercial
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Razón Social / Nombre <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        name="name"
                                        required
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all"
                                        placeholder="Ej. Importadora Los Andes C.A."
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">RIF / Cédula <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        name="rifOrId"
                                        required
                                        value={formData.rifOrId}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all"
                                        placeholder="Ej. J-12345678-9"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Contacto */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Phone size={14} /> Datos de Contacto
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Email <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all"
                                        placeholder="contacto@empresa.com"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Teléfono <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="tel"
                                        name="phone"
                                        required
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all"
                                        placeholder="+58 412 1234567"
                                    />
                                </div>
                            </div>
                            <div className="col-span-1 md:col-span-2 space-y-1">
                                <label className="text-sm font-medium text-slate-700">Persona de Contacto <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        name="contactPerson"
                                        required
                                        value={formData.contactPerson}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all"
                                        placeholder="Nombre del encargado"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Ubicación */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <MapPin size={14} /> Ubicación
                        </h4>
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Dirección Fiscal / Principal <span className="text-red-500">*</span></label>
                                <textarea
                                    name="address"
                                    required
                                    value={formData.address}
                                    onChange={handleChange}
                                    rows="2"
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all resize-none"
                                    placeholder="Dirección completa de la empresa..."
                                ></textarea>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Dirección de Entrega <span className="text-red-500">*</span></label>
                                <textarea
                                    name="deliveryAddress"
                                    required
                                    value={formData.deliveryAddress}
                                    onChange={handleChange}
                                    rows="2"
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all resize-none"
                                    placeholder="¿Dónde se recibirá la carga?"
                                ></textarea>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Punto de Referencia (Opcional)</label>
                                <textarea
                                    name="referencePoint"
                                    value={formData.referencePoint}
                                    onChange={handleChange}
                                    rows="1"
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all resize-none"
                                    placeholder="Ej. Detrás del centro comercial..."
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-secondary hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Guardar Cliente
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClientFormModal;
