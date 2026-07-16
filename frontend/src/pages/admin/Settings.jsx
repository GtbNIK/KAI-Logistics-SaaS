import React, { useState, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import EntityTable from '../../components/shared/EntityTable';
import EntityFormModal from '../../components/shared/EntityFormModal';
import ConfirmDeleteModal from '../../components/modals/ConfirmDeleteModal';
import UserViewModal from '../../components/modals/UserViewModal';
import authService from '../../services/auth.service';
import {
    Save, Briefcase, Users, Key, Palette,
    FileText, Image, UserPlus, Mail, Lock,
    User, ShieldCheck, Eye, EyeOff, X, Upload, Trash2, Phone
} from 'lucide-react';

// ─────────────────────────────────────────────────
// Servicio adaptado para que EntityFormModal pueda
// llamar a create() y update() sin problemas
// ─────────────────────────────────────────────────
const userService = {
    create: (data) => authService.register(data),
    update: (id, data) => authService.updateUser(id, data),
};

// Secciones del formulario para Crear / Editar usuario
const getUserFormSections = (isNew) => [
    {
        title: 'Información del usuario',
        columns: 2,
        fields: [
            {
                name: 'name',
                label: 'Nombre completo',
                type: 'text',
                required: true,
                icon: User,
                placeholder: 'Ej: Juan Pérez',
            },
            {
                name: 'email',
                label: 'Correo electrónico',
                type: 'email',
                required: true,
                icon: Mail,
                placeholder: 'usuario@empresa.com',
            },
            {
                name: 'phoneNumber',
                label: 'Teléfono',
                type: 'text',
                required: false,
                icon: Phone,
                placeholder: '+58 412 123 4567',
                stripPattern: /\D/g,
            },
            {
                name: 'position',
                label: 'Cargo',
                type: 'text',
                required: false,
                icon: Briefcase,
                placeholder: 'Ej: Gerente de Operaciones',
                stripPattern: /[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g,
            },
            {
                name: 'role',
                label: 'Rol',
                type: 'select',
                required: true,
                defaultValue: 'SALES',
                options: [
                    { value: 'ADMIN', label: 'Administrador' },
                    { value: 'SALES', label: 'Ventas' },
                ],
            },
            ...(isNew
                ? [{
                    name: 'password',
                    label: 'Contraseña',
                    type: 'password',
                    required: true,
                    icon: Lock,
                    placeholder: 'Mínimo 6 caracteres',
                    hint: 'El usuario NO podrá cambiarla después.',
                }]
                : []),
        ],
    },
];

// ─────────────────────────────────────────────────
// Modal de cambio de contraseña
// ─────────────────────────────────────────────────
const ResetPasswordModal = ({ isOpen, onClose, user, onSuccess }) => {
    const { showSuccess, showError } = useToast();
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => { if (isOpen) setPassword(''); }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await authService.resetPassword(user.id, password);
            showSuccess('Contraseña actualizada', `La contraseña de ${user.name} se cambió correctamente`);
            onSuccess?.();
            onClose();
        } catch (error) {
            showError('Error', error.response?.data?.message || 'No se pudo cambiar la contraseña');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <div>
                        <h3 className="font-bold text-slate-800">Cambiar Contraseña</h3>
                        <p className="text-xs text-slate-500">{user?.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nueva Contraseña</label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type={showPwd ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                placeholder="Mínimo 6 caracteres"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPwd(!showPwd)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">El usuario deberá usar esta contraseña en su próximo inicio de sesión.</p>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2 text-sm bg-primary-dark hover:bg-primary text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Key size={14} />}
                            {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────
// Upload de imagen con drag & drop para fondos de PDF
// ─────────────────────────────────────────────────
const PdfBackgroundUploader = ({ label, description, currentUrl, file, onFileChange, onRemove }) => {
    const [dragging, setDragging] = useState(false);

    const handleFile = (f) => {
        if (!f) return;
        if (!f.type.startsWith('image/')) return;
        onFileChange(f);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files[0]);
    };

    const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
    const handleDragLeave = () => setDragging(false);

// Determinar qué mostrar como preview
    const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
    const previewSrc = file
        ? URL.createObjectURL(file)           // Archivo nuevo local (aún sin guardar)
        : currentUrl
            ? (String(currentUrl).startsWith('http') ? currentUrl : `${API_BASE}${currentUrl}`) // Absoluta o relativa
            : null;

    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
            <p className="text-xs text-slate-400 mb-3">{description}</p>

            {previewSrc ? (
                // Vista previa
                <div className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                    <img
                        src={previewSrc}
                        alt={label}
                        className="w-full h-40 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <button
                            type="button"
                            onClick={onRemove}
                            className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                            title="Eliminar fondo"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                    <div className="absolute bottom-2 right-2">
                        <span className={`text-white text-xs px-2 py-0.5 rounded-full font-medium shadow-sm ${file ? 'bg-amber-500' : 'bg-green-500'}`}>
                            {file ? 'Nueva — sin guardar' : 'Guardada'}
                        </span>
                    </div>
                </div>
            ) : (
                // Zona de drop
                <label
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                        dragging
                            ? 'border-primary bg-primary/5 scale-[1.02]'
                            : 'border-slate-300 hover:border-primary/50 hover:bg-slate-50'
                    }`}
                >
                    <Upload size={28} className={`mb-2 ${dragging ? 'text-primary' : 'text-slate-400'}`} />
                    <p className="text-sm text-slate-500 font-medium">
                        {dragging ? 'Suelta la imagen aquí' : 'Arrastra una imagen o haz clic'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">JPG, PNG — máx. 5MB</p>
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFile(e.target.files[0])}
                    />
                </label>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════
const Settings = () => {
    const { settings, updateSettings, loading } = useSettings();
    const { showSuccess, showError } = useToast();
    const [activeTab, setActiveTab] = useState('general');

    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);

    // Archivos de fondo pendientes de subir
    const [pendingFiles, setPendingFiles] = useState({ quoteBg: null, noticeBg: null, deliveryNoteBg: null, receiptBg: null, rateBg: null });
    // Flags de eliminación de fondos
    const [pendingRemovals, setPendingRemovals] = useState({ removeQuoteBg: false, removeNoticeBg: false, removeDeliveryNoteBg: false, removeReceiptBg: false, removeRateBg: false });

    // Estados usuarios
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);

    // Modales
    const [viewModal, setViewModal] = useState({ open: false, user: null });
    const [formModal, setFormModal] = useState({ open: false, editMode: false, user: null });
    const [resetModal, setResetModal] = useState({ open: false, user: null });
    const [deleteModal, setDeleteModal] = useState({ open: false, user: null });
    const [deletingUser, setDeletingUser] = useState(false);

    useEffect(() => {
        if (settings) setFormData(settings);
    }, [settings]);

    useEffect(() => {
        if (activeTab === 'users') fetchUsers();
    }, [activeTab]);

    const fetchUsers = async () => {
        setUsersLoading(true);
        try {
            const data = await authService.getUsers();
            setUsers(data.users || []);
        } catch {
            showError('Error', 'No se pudo cargar la lista de usuarios');
        } finally {
            setUsersLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            await updateSettings(formData, pendingFiles, pendingRemovals);
            // Resetear estados pendientes
            setPendingFiles({ quoteBg: null, noticeBg: null, deliveryNoteBg: null, receiptBg: null, rateBg: null });
            setPendingRemovals({ removeQuoteBg: false, removeNoticeBg: false, removeDeliveryNoteBg: false, removeReceiptBg: false, removeRateBg: false });
        } finally {
            setSaving(false);
        }
    };

    const confirmDeleteUser = async () => {
        setDeletingUser(true);
        try {
            await authService.deleteUser(deleteModal.user.id);
            showSuccess('Usuario desactivado', `${deleteModal.user.name} fue desactivado. Su historial se conserva.`);
            setDeleteModal({ open: false, user: null });
            fetchUsers();
        } catch (error) {
            showError('Error', error.response?.data?.message || 'No se pudo eliminar el usuario');
        } finally {
            setDeletingUser(false);
        }
    };

    if (loading && !settings) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    const tabs = [
        { id: 'general', label: 'Empresa & Apariencia', icon: Briefcase },
        { id: 'users', label: 'Usuarios', icon: Users },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Configuración del Sistema</h1>

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-8">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }`}
                            >
                                <Icon size={18} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* ────── EMPRESA & APARIENCIA ────── */}
            {activeTab === 'general' && (
                <div className="space-y-8 w-full max-w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Card Empresa */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Briefcase size={18} className="text-primary" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-slate-800">Información de la Empresa</h2>
                                <p className="text-xs text-slate-500">Datos que aparecerán en tus documentos y PDFs</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Empresa</label>
                                    <input
                                        type="text"
                                        name="companyName"
                                        value={formData.companyName || ''}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                                        placeholder="Mi Empresa, C.A."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">RIF / Identificación Fiscal</label>
                                    <input
                                        type="text"
                                        name="rif"
                                        value={formData.rif || ''}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                                        placeholder="J-12345678-9"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                                    <Image size={14} /> URL del Logo
                                </label>
                                <input
                                    type="text"
                                    name="logoUrl"
                                    value={formData.logoUrl || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                                    placeholder="https://ejemplo.com/logo.png"
                                />
                                {formData.logoUrl && (
                                    <div className="mt-3 p-3 border border-slate-200 rounded-lg bg-slate-50 inline-flex items-center gap-3">
                                        <img src={formData.logoUrl} alt="Logo Preview" className="h-10 object-contain" />
                                        <span className="text-xs text-slate-400">Vista previa</span>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                                    <FileText size={14} /> Texto Encabezado PDF
                                </label>
                                <input
                                    type="text"
                                    name="headerText"
                                    value={formData.headerText || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                                    placeholder="Texto del encabezado en documentos"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                                    <FileText size={14} /> Texto Pie de Página PDF
                                </label>
                                <textarea
                                    name="footerText"
                                    value={formData.footerText || ''}
                                    onChange={handleInputChange}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm resize-none"
                                    placeholder="Texto al pie de los documentos"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                                    <FileText size={14} /> Datos Bancarios / Información de Pago
                                </label>
                                <textarea
                                    name="paymentInfo"
                                    value={formData.paymentInfo || ''}
                                    onChange={handleInputChange}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                                    placeholder={"Banco: Banesco\nCuenta: 0134-...\nTitular: Mi Empresa C.A.\nPago Móvil: 04XX-XXXXXXX"}
                                />
                                <p className="text-xs text-slate-400 mt-1">Este texto aparecerá en el bloque de información de pago del PDF de Avisos de Cobro.</p>
                            </div>
                        </div>
                    </div>

                    {/* Card Apariencia */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Palette size={18} className="text-primary" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-slate-800">Apariencia</h2>
                                <p className="text-xs text-slate-500">Personaliza los colores del sistema</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Color Primario</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="color"
                                            name="primaryColor"
                                            value={formData.primaryColor || '#003366'}
                                            onChange={handleInputChange}
                                            className="h-11 w-20 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                                        />
                                        <span className="text-slate-600 font-mono text-sm bg-slate-100 px-3 py-1.5 rounded-lg">
                                            {formData.primaryColor || '#003366'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">Botones, encabezados, elementos activos.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Color Secundario</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="color"
                                            name="secondaryColor"
                                            value={formData.secondaryColor || '#FFA500'}
                                            onChange={handleInputChange}
                                            className="h-11 w-20 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                                        />
                                        <span className="text-slate-600 font-mono text-sm bg-slate-100 px-3 py-1.5 rounded-lg">
                                            {formData.secondaryColor || '#FFA500'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">Acentos, bordes y elementos secundarios.</p>
                                </div>
                            </div>
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Vista Previa</h3>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <button
                                        style={{ backgroundColor: formData.primaryColor || '#003366' }}
                                        className="px-4 py-2 rounded-lg text-white text-sm font-medium shadow-sm"
                                        type="button"
                                    >
                                        Botón Primario
                                    </button>
                                    <button
                                        style={{ color: formData.primaryColor || '#003366', borderColor: formData.primaryColor || '#003366' }}
                                        className="px-4 py-2 rounded-lg border text-sm font-medium bg-white"
                                        type="button"
                                    >
                                        Botón Outline
                                    </button>
                                    <span
                                        style={{ backgroundColor: formData.secondaryColor || '#FFA500' }}
                                        className="px-3 py-1 rounded-full text-white text-xs font-semibold"
                                    >
                                        Badge
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                    {/* Card Fondos de PDF */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Image size={18} className="text-primary" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-slate-800">Fondos de PDF</h2>
                                <p className="text-xs text-slate-500">Imágenes de fondo para documentos generados (JPG/PNG)</p>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Upload Cotización */}
                                <PdfBackgroundUploader
                                    label="Fondo de Cotización"
                                    description="Se usará como fondo en el PDF de cotizaciones"
                                    currentUrl={pendingRemovals.removeQuoteBg ? null : formData.quoteBgUrl}
                                    file={pendingFiles.quoteBg}
                                    onFileChange={(f) => {
                                        setPendingFiles(prev => ({ ...prev, quoteBg: f }));
                                        setPendingRemovals(prev => ({ ...prev, removeQuoteBg: false }));
                                    }}
                                    onRemove={() => {
                                        setPendingFiles(prev => ({ ...prev, quoteBg: null }));
                                        setPendingRemovals(prev => ({ ...prev, removeQuoteBg: true }));
                                    }}
                                />
                                {/* Upload Aviso de Cobro */}
                                <PdfBackgroundUploader
                                    label="Fondo de Aviso de Cobro"
                                    description="Se usará como fondo en el PDF de avisos de cobro"
                                    currentUrl={pendingRemovals.removeNoticeBg ? null : formData.noticeBgUrl}
                                    file={pendingFiles.noticeBg}
                                    onFileChange={(f) => {
                                        setPendingFiles(prev => ({ ...prev, noticeBg: f }));
                                        setPendingRemovals(prev => ({ ...prev, removeNoticeBg: false }));
                                    }}
                                    onRemove={() => {
                                        setPendingFiles(prev => ({ ...prev, noticeBg: null }));
                                        setPendingRemovals(prev => ({ ...prev, removeNoticeBg: true }));
                                    }}
                                />
                                {/* Upload Nota de Entrega */}
                                <PdfBackgroundUploader
                                    label="Fondo de Nota de Entrega"
                                    description="Se usará como fondo en el PDF de notas de entrega"
                                    currentUrl={pendingRemovals.removeDeliveryNoteBg ? null : formData.deliveryNoteBgUrl}
                                    file={pendingFiles.deliveryNoteBg}
                                    onFileChange={(f) => {
                                        setPendingFiles(prev => ({ ...prev, deliveryNoteBg: f }));
                                        setPendingRemovals(prev => ({ ...prev, removeDeliveryNoteBg: false }));
                                    }}
                                    onRemove={() => {
                                        setPendingFiles(prev => ({ ...prev, deliveryNoteBg: null }));
                                        setPendingRemovals(prev => ({ ...prev, removeDeliveryNoteBg: true }));
                                    }}
                                />
                                {/* Upload Recibo de Pago */}
                                <PdfBackgroundUploader
                                    label="Fondo de Recibo de Pago"
                                    description="Se usará como fondo en el PDF de recibos de pago (Efectivo USD)"
                                    currentUrl={pendingRemovals.removeReceiptBg ? null : formData.receiptBgUrl}
                                    file={pendingFiles.receiptBg}
                                    onFileChange={(f) => {
                                        setPendingFiles(prev => ({ ...prev, receiptBg: f }));
                                        setPendingRemovals(prev => ({ ...prev, removeReceiptBg: false }));
                                    }}
                                    onRemove={() => {
                                        setPendingFiles(prev => ({ ...prev, receiptBg: null }));
                                        setPendingRemovals(prev => ({ ...prev, removeReceiptBg: true }));
                                    }}
                                />
                                {/* Upload Tarifa */}
                                <PdfBackgroundUploader
                                    label="Fondo de Tarifario"
                                    description="Se usará como fondo en el PDF de tarifas"
                                    currentUrl={pendingRemovals.removeRateBg ? null : formData.rateBgUrl}
                                    file={pendingFiles.rateBg}
                                    onFileChange={(f) => {
                                        setPendingFiles(prev => ({ ...prev, rateBg: f }));
                                        setPendingRemovals(prev => ({ ...prev, removeRateBg: false }));
                                    }}
                                    onRemove={() => {
                                        setPendingFiles(prev => ({ ...prev, rateBg: null }));
                                        setPendingRemovals(prev => ({ ...prev, removeRateBg: true }));
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                {/* Botón guardar unificado */}
                    <div className="flex justify-center pt-4">
                        <button
                            onClick={handleSaveSettings}
                            disabled={saving}
                            className="inline-flex items-center gap-2 bg-secondary hover:bg-orange-600 text-white px-10 py-3 rounded-xl font-bold text-base transition-all shadow-lg shadow-secondary/20 hover:shadow-secondary/40 disabled:opacity-50 disabled:transform-none transform hover:-translate-y-0.5"
                        >
                            <Save size={16} />
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </div>
            )}

            {/* ────── USUARIOS ────── */}
            {activeTab === 'users' && (
                <div className="space-y-4">
                    {/* Botón agregar encima de la tabla */}
                    <div className="flex justify-end">
                        <button
                            onClick={() => setFormModal({ open: true, editMode: false, user: null })}
                            className="inline-flex items-center gap-2 bg-secondary hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg shadow-orange-500/20 active:scale-95"
                        >
                            <UserPlus size={16} />
                            Agregar Usuario
                        </button>
                    </div>

                    <EntityTable
                        items={users}
                        columns={[
                            { header: 'Nombre', accessor: 'name' },
                            { header: 'Email', accessor: 'email' },
                            { header: 'Cargo', accessor: 'position' },
                            {
                                header: 'Rol',
                                accessor: 'role',
                                render: (u) => (
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                        u.role === 'ADMIN'
                                            ? 'bg-purple-100 text-purple-700'
                                            : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {u.role === 'ADMIN' ? 'Administrador' : 'Ventas'}
                                    </span>
                                ),
                            },
                        ]}
                        loading={usersLoading}
                        totalItems={users.length}
                        totalPages={1}
                        page={1}
                        entityName="usuario"
                        entityNamePlural="usuarios"
                        canEdit
                        canDelete
                        showToggle={false}
                        showStatusFilter={false}
                        onView={(u) => setViewModal({ open: true, user: u })}
                        onEdit={(u) => setFormModal({ open: true, editMode: true, user: u })}
                        onDelete={(u) => setDeleteModal({ open: true, user: u })}
                    />
                </div>
            )}

            {/* ────── MODALES ────── */}

            {/* Ver usuario */}
            <UserViewModal
                isOpen={viewModal.open}
                user={viewModal.user}
                onClose={() => setViewModal({ open: false, user: null })}
            />

            {/* Crear / Editar usuario */}
            <EntityFormModal
                isOpen={formModal.open}
                onClose={() => setFormModal({ open: false, editMode: false, user: null })}
                onSuccess={fetchUsers}
                editMode={formModal.editMode}
                entityData={formModal.user}
                service={userService}
                entityName="usuario"
                title={formModal.editMode ? 'Editar Usuario' : 'Agregar Nuevo Usuario'}
                sections={getUserFormSections(!formModal.editMode)}
            />

            {/* Cambiar contraseña */}
            <ResetPasswordModal
                isOpen={resetModal.open}
                user={resetModal.user}
                onClose={() => setResetModal({ open: false, user: null })}
                onSuccess={fetchUsers}
            />

            {/* Eliminar usuario */}
            <ConfirmDeleteModal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ open: false, user: null })}
                onConfirm={confirmDeleteUser}
                title="Desactivar Usuario"
                itemName={deleteModal.user?.name}
                message="El usuario será desactivado y no podrá iniciar sesión. Su historial (cotizaciones, envíos) se conservará intacto."
                loading={deletingUser}
            />
        </div>
    );
};

export default Settings;