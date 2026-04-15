import { useState, useEffect } from 'react';
import { DollarSign, Plus, Ship, Globe, Search, Filter, Calendar, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import rateService from '../../services/rate.service';
import RateFormModal from '../../components/rates/RateFormModal';
import ConfirmDeleteModal from '../../components/modals/ConfirmDeleteModal';

const Rates = () => {
    const { user } = useAuth();
    const toast = useToast();
    const isAdmin = user?.role === 'ADMIN';

    // Estado de tabs
    const [activeTab, setActiveTab] = useState('CHINA');

    // Estado de datos
    const [rates, setRates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Filtros
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('valid'); // valid | expired | all

    // Modales
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedRate, setSelectedRate] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);

    // Cargar tarifas
    useEffect(() => {
        loadRates();
    }, [activeTab, page, statusFilter]);

    const loadRates = async () => {
        setLoading(true);
        try {
            const params = {
                region: activeTab,
                status: statusFilter,
                page,
                limit: 20
            };

            const response = await rateService.getRates(params);
            setRates(response.data || []);
            setTotalPages(response.meta?.totalPages || 1);
            setTotalItems(response.meta?.total || 0);
        } catch (error) {
            console.error('Error loading rates:', error);
            toast.showError('Error', 'No se pudieron cargar las tarifas');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setSelectedRate(null);
        setIsEditMode(false);
        setIsFormOpen(true);
    };

    const handleEdit = (rate) => {
        setSelectedRate(rate);
        setIsEditMode(true);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (rate) => {
        setSelectedRate(rate);
        setIsDeleteOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedRate) return;

        try {
            await rateService.deleteRate(selectedRate.id);
            toast.entityDeleted('Tarifa');
            setIsDeleteOpen(false);
            setSelectedRate(null);
            loadRates();
        } catch (error) {
            console.error('Error deleting rate:', error);
            toast.showError('Error', error.response?.data?.message || 'No se pudo eliminar la tarifa');
        }
    };

    const handleFormSuccess = () => {
        loadRates();
    };

    const isExpired = (validUntil) => {
        return new Date(validUntil) < new Date();
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Tarifario</h1>
                    <p className="text-sm text-slate-500 mt-1">Gestión de tarifas por región</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={handleCreate}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95 text-sm"
                    >
                        <Plus size={16} />
                        Nueva Tarifa {activeTab === 'CHINA' ? 'China' : 'Otros Países'}
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    onClick={() => {
                        setActiveTab('CHINA');
                        setPage(1);
                    }}
                    className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                        activeTab === 'CHINA'
                            ? 'border-red-500 text-red-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Ship size={16} />
                    China
                    {activeTab === 'CHINA' && totalItems > 0 && (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                            {totalItems}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => {
                        setActiveTab('OTHER');
                        setPage(1);
                    }}
                    disabled
                    className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px opacity-50 cursor-not-allowed ${
                        activeTab === 'OTHER'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-slate-500'
                    }`}
                    title="Próximamente"
                >
                    <Globe size={16} />
                    Otros Países
                    <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">
                        Próximamente
                    </span>
                </button>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Filter size={16} />
                        Estado:
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setStatusFilter('valid');
                                setPage(1);
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                statusFilter === 'valid'
                                    ? 'bg-green-100 text-green-700 border border-green-300'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Vigentes
                        </button>
                        <button
                            onClick={() => {
                                setStatusFilter('expired');
                                setPage(1);
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                statusFilter === 'expired'
                                    ? 'bg-red-100 text-red-700 border border-red-300'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Expiradas
                        </button>
                        <button
                            onClick={() => {
                                setStatusFilter('all');
                                setPage(1);
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                statusFilter === 'all'
                                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Todas
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : rates.length === 0 ? (
                    <div className="text-center py-12">
                        <DollarSign className="mx-auto text-slate-300 mb-3" size={48} />
                        <p className="text-slate-500 font-medium">No hay tarifas registradas</p>
                        <p className="text-sm text-slate-400 mt-1">
                            {isAdmin ? 'Crea una nueva tarifa para comenzar' : 'Contacta al administrador'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                                            Aliado
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                                            Ruta
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                                            Venta 20HC
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                                            Venta 40HC
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                                            Línea Naviera
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                                            Días Libres
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                                            Validez
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                                            Estado
                                        </th>
                                        {isAdmin && (
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                                                Acciones
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {rates.map((rate) => (
                                        <tr key={rate.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="text-sm font-medium text-slate-800">
                                                    {rate.ally?.name}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {rate.ally?.internalCode}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm text-slate-700">
                                                    {rate.originPort?.code} → {rate.destinationPort?.code}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {rate.originPort?.name} - {rate.destinationPort?.name}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-semibold text-green-600">
                                                    ${rate.sale20HC?.toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-semibold text-green-600">
                                                    ${rate.sale40HC?.toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-slate-700">
                                                    {rate.shippingLine?.name || '-'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-slate-700">
                                                    {rate.freeDays} días
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    <span className="text-sm text-slate-700">
                                                        {formatDate(rate.validUntil)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {isExpired(rate.validUntil) ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                                        <AlertCircle size={12} />
                                                        Expirada
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                                        Vigente
                                                    </span>
                                                )}
                                            </td>
                                            {isAdmin && (
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleEdit(rate)}
                                                            className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(rate)}
                                                            className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginación */}
                        {totalPages > 1 && (
                            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
                                <p className="text-sm text-slate-600">
                                    Mostrando página {page} de {totalPages} ({totalItems} tarifas)
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Anterior
                                    </button>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modales */}
            <RateFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSuccess={handleFormSuccess}
                editMode={isEditMode}
                rateData={selectedRate}
                region={activeTab}
            />

            <ConfirmDeleteModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={handleDelete}
                entityName="tarifa"
                entityIdentifier={selectedRate ? `${selectedRate.originPort?.code} → ${selectedRate.destinationPort?.code}` : ''}
            />
        </div>
    );
};

export default Rates;
