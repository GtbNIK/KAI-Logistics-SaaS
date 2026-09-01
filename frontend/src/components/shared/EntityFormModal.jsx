import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { PhoneInput } from 'react-international-phone';
import { PhoneNumberUtil } from 'google-libphonenumber';
import 'react-international-phone/style.css';

const phoneUtil = PhoneNumberUtil.getInstance();

/**
 * Valida si un número de teléfono es válido según estándares internacionales
 * @param {string} phone - Número de teléfono a validar
 * @returns {boolean} True si es válido, false en caso contrario
 */
const isPhoneValid = (phone) => {
    try {
        return phoneUtil.isValidNumber(phoneUtil.parseAndKeepRawInput(phone));
    } catch (error) {
        return false;
    }
};

/**
 * Modal de formulario genérico para crear/editar cualquier entidad
 * @param {Object} props
 * @param {boolean} props.isOpen - Si el modal está abierto
 * @param {Function} props.onClose - Handler para cerrar
 * @param {Function} props.onSuccess - Handler cuando se guarda exitosamente
 * @param {boolean} props.editMode - Si está en modo edición
 * @param {Object} props.entityData - Datos de la entidad (para edición)
 * @param {Object} props.service - Servicio de API con create/update
 * @param {string} props.entityName - Nombre de la entidad
 * @param {string} props.title - Título personalizado (opcional)
 * @param {Array} props.sections - Secciones del formulario
 */
const EntityFormModal = ({
    isOpen,
    onClose,
    onSuccess,
    editMode = false,
    entityData = null,
    service,
    entityName = 'elemento',
    title,
    sections = []
}) => {
    const toast = useToast();
    const [formData, setFormData] = useState({});
    const [showPasswords, setShowPasswords] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const phoneInputRef = useRef(null);

    // Inicializar formData cuando abre el modal
    useEffect(() => {
        if (isOpen) {
            if (editMode && entityData) {
                // Poblar con datos existentes
                const initialData = {};
                sections.forEach(section => {
                    section.fields.forEach(field => {
                        if (field.type === 'multiselect') {
                            // Extraer IDs del array de objetos. Usa relationKey o fallback a field.name
                            const sourceKey = field.relationKey || field.name;
                            const arrayData = entityData[sourceKey];
                            initialData[field.name] = Array.isArray(arrayData)
                                ? arrayData.map(u => u.id || u.userId)
                                : [];
                        } else {
                            initialData[field.name] = entityData[field.name] || '';
                        }
                    });
                });
                setFormData(initialData);
            } else {
                // Formulario vacío con valores por defecto
                const initialData = {};
                sections.forEach(section => {
                    section.fields.forEach(field => {
                        initialData[field.name] = field.type === 'multiselect' ? [] : (field.defaultValue || '');
                    });
                });
                setFormData(initialData);
            }
            setError('');
            setFieldErrors({});
        }
    }, [isOpen, editMode, entityData, sections]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        let newValue = type === 'checkbox' ? checked : value;
        // Aplicar filtro por campo si está definido (ej. solo letras para "Cargo")
        const fieldConfig = sections.flatMap(s => s.fields).find(f => f.name === name);
        if (fieldConfig?.stripPattern && typeof newValue === 'string') {
            newValue = newValue.replace(fieldConfig.stripPattern, '');
        }
        setFormData(prev => ({
            ...prev,
            [name]: newValue
        }));
        // Limpiar error del campo si el usuario empieza a escribir
        if (fieldErrors[name]) {
            setFieldErrors(prev => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validar campos phone requeridos
        const phoneFields = sections.flatMap(s => s.fields).filter(f => f.type === 'phone' && f.required);
        const newFieldErrors = {};
        let hasErrors = false;
        let firstErrorField = null;
        phoneFields.forEach(field => {
            const value = formData[field.name] || '';
            // Validar con google-libphonenumber
            if (!value || !isPhoneValid(value)) {
                newFieldErrors[field.name] = !value ? 'Este campo es obligatorio' : 'Número de teléfono inválido';
                hasErrors = true;
                if (!firstErrorField) firstErrorField = field;
            }
        });
        if (hasErrors) {
            setFieldErrors(newFieldErrors);
            toast.showError('Campo requerido', 'Por favor complete el campo de teléfono');
            // Hacer focus al campo teléfono con error
            setTimeout(() => {
                if (phoneInputRef.current) {
                    const input = phoneInputRef.current.querySelector('input[type="tel"]');
                    if (input) input.focus();
                }
            }, 100);
            return;
        }
        setFieldErrors({});

        setLoading(true);

        try {
            const capitalizedName = entityName.charAt(0).toUpperCase() + entityName.slice(1);
            if (editMode && entityData) {
                const updateMethod = service.update || service.updateItem || service[`update${entityName}`];
                await updateMethod(entityData.id, formData);
                toast.entityUpdated(capitalizedName);
            } else {
                const createMethod = service.create || service.createItem || service[`create${entityName}`];
                await createMethod(formData);
                toast.entityCreated(capitalizedName);
            }
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error(`Error saving ${entityName}:`, err);
            setError(err.response?.data?.message || `Error al ${editMode ? 'actualizar' : 'crear'} ${entityName}`);
            toast.showError(`Error al ${editMode ? 'actualizar' : 'crear'}`, err.response?.data?.message || 'Revisa los datos e intenta nuevamente');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || typeof document === 'undefined') return null;

    const modalTitle = title || (editMode ? `Editar ${entityName}` : `Nuevo ${entityName}`);
    const modalSubtitle = editMode ? `Actualizar información del ${entityName}` : `Registrar un nuevo ${entityName}`;

    const modal = (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 sticky top-0 backdrop-blur-md z-10">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 capitalize">{modalTitle}</h3>
                        <p className="text-sm text-slate-500">{modalSubtitle}</p>
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
                    {sections.map((section, sectionIndex) => (
                        <div key={sectionIndex} className="space-y-4">
                            {section.title && (
                                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    {section.icon && <section.icon size={14} />}
                                    {section.title}
                                </h4>
                            )}
                            
                            <div className={`grid gap-4 ${section.columns === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                                {section.fields.map((field, fieldIndex) => (
                                    <div 
                                        key={fieldIndex} 
                                        className={`space-y-1 ${field.fullWidth ? 'col-span-1 md:col-span-2' : ''}`}
                                    >
                                        <label className="text-sm font-medium text-slate-700">
                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                        </label>
                                        
                                        {field.type === 'textarea' ? (
                                            <textarea
                                                name={field.name}
                                                required={field.required}
                                                disabled={field.disabled}
                                                value={formData[field.name] || ''}
                                                onChange={handleChange}
                                                rows={field.rows || 2}
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                                                placeholder={field.placeholder}
                                            />
                                        ) : field.type === 'select' ? (
                                            <select
                                                name={field.name}
                                                required={field.required}
                                                disabled={field.disabled}
                                                value={formData[field.name] || ''}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                <option value="">{field.placeholder || 'Seleccionar...'}</option>
                                                {field.options?.map((opt, i) => (
                                                    <option key={i} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        ) : field.type === 'multiselect' ? (
                                            <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-40 overflow-y-auto">
                                                {field.options?.length > 0 ? (
                                                    field.options.map(opt => (
                                                        <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer hover:bg-white p-1.5 rounded-lg transition-colors">
                                                            <input
                                                                type="checkbox"
                                                                disabled={field.disabled}
                                                                checked={(formData[field.name] || []).includes(opt.value)}
                                                                onChange={() => {
                                                                    const current = formData[field.name] || [];
                                                                    const next = current.includes(opt.value)
                                                                        ? current.filter(v => v !== opt.value)
                                                                        : [...current, opt.value];
                                                                    setFormData(prev => ({ ...prev, [field.name]: next }));
                                                                }}
                                                                className="w-4 h-4 rounded accent-orange-500"
                                                            />
                                                            <span className="text-sm text-slate-700">{opt.label}</span>
                                                        </label>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-slate-400 italic">No hay opciones disponibles</p>
                                                )}
                                            </div>
                                        ) : field.type === 'phone' ? (
                                            <div className="phone-input-container w-full" ref={phoneInputRef}>
                                                {/* No renderizar PhoneInput hasta que formData tenga valor en modo edición */}
                                                {(!editMode || formData[field.name]) ? (
                                                    <PhoneInput
                                                        defaultCountry="ve"
                                                        disabled={field.disabled}
                                                        value={formData[field.name] || ''}
                                                        onChange={phone => handleChange({ target: { name: field.name, value: phone, type: 'text' } })}
                                                        inputClassName={`!w-full !py-2 !h-auto !bg-slate-50 border !rounded-r-xl focus:!outline-none focus:!ring-2 focus:!ring-primary-light/20 focus:!border-primary-light transition-all ${fieldErrors[field.name] ? '!border-red-500' : 'border-slate-200'}`}
                                                        countrySelectorStyleProps={{
                                                            buttonClassName: `!bg-slate-50 border !rounded-l-xl !px-3 !h-10 ${fieldErrors[field.name] ? '!border-red-500' : 'border-slate-200'}`
                                                        }}
                                                    />
                                                ) : (
                                                    // Skeleton mientras carga el valor
                                                    <div className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl animate-pulse" />
                                                )}
                                            </div>
                                        ) : field.type === 'password' ? (
                                            <div className="relative">
                                                <input
                                                    type={showPasswords[field.name] ? 'text' : 'password'}
                                                    name={field.name}
                                                    required={field.required}
                                                    disabled={field.disabled}
                                                    value={formData[field.name] || ''}
                                                    onChange={handleChange}
                                                    maxLength={field.maxLength}
                                                    className="w-full py-2 pr-12 pl-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                                    placeholder={field.placeholder || '••••••••'}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswords(prev => ({ ...prev, [field.name]: !prev[field.name] }))}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                                    tabIndex={-1}
                                                >
                                                    {showPasswords[field.name] ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                {field.icon && (
                                                    <field.icon className={`absolute left-3 top-1/2 -translate-y-1/2 ${field.disabled ? 'text-slate-300' : 'text-slate-400'}`} size={18} />
                                                )}
                                                <input
                                                    type={field.type || 'text'}
                                                    name={field.name}
                                                    required={field.required}
                                                    disabled={field.disabled}
                                                    value={formData[field.name] || ''}
                                                    onChange={handleChange}
                                                    maxLength={field.maxLength}
                                                    className={`w-full py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all ${field.icon ? 'pl-10 pr-4' : 'px-4'} disabled:opacity-60 disabled:cursor-not-allowed`}
                                                    placeholder={field.placeholder}
                                                />
                                            </div>
                                        )}
                                        {field.hint && (
                                            <p className="text-xs text-slate-400 mt-1">{field.hint}</p>
                                        )}
                                        {fieldErrors[field.name] && (
                                            <p className="text-xs text-red-500 mt-1">{fieldErrors[field.name]}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Error message */}
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-center gap-2">
                            <X size={16} /> {error}
                        </div>
                    )}

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
                                    {editMode ? 'Actualizando...' : 'Guardando...'}
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    {editMode ? 'Actualizar' : 'Guardar'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
};

export default EntityFormModal;
