import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, X, Package, User, Calendar, DollarSign, Loader2 } from 'lucide-react';
import quoteService from '../../services/quote.service';
import EntityTable from '../../components/shared/EntityTable';
import ConfirmDeleteModal from '../../components/modals/ConfirmDeleteModal';
import { quoteConfig } from '../../config/quoteConfig';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

// Hook personalizado para cotizaciones
const useQuotes = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({});
    
    const { showError, showSuccess } = useToast();

    const fetchQuotes = async () => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: 10,
                search,
                ...filters
            };
            const response = await quoteService.getQuotes(params);
            setItems(response.data);
            setTotalItems(response.meta.total);
            setTotalPages(response.meta.totalPages);
        } catch (error) {
            console.error('Error fetching quotes:', error);
            showError('Error', 'Error al cargar cotizaciones');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuotes();
    }, [page, search, filters]);

    const deleteQuote = async (id) => {
        try {
            await quoteService.deleteQuote(id);
            showSuccess('¡Eliminada!', 'Cotización eliminada correctamente');
            fetchQuotes();
            return true;
        } catch (error) {
            console.error('Error deleting quote:', error);
            showError('Error', error.response?.data?.message || 'Error al eliminar');
            return false;
        }
    };

    return {
        items,
        loading,
        totalItems,
        totalPages,
        page,
        setPage,
        search,
        setSearch,
        filters,
        setFilters,
        refresh: fetchQuotes,
        deleteQuote
    };
};

// Modal de visualización de cotización
const QuoteViewModal = ({ quote, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [fullQuote, setFullQuote] = useState(null);

    useEffect(() => {
        const loadQuote = async () => {
            try {
                const data = await quoteService.getQuote(quote.id);
                setFullQuote(data);
            } catch (error) {
                console.error('Error loading quote:', error);
            } finally {
                setLoading(false);
            }
        };
        loadQuote();
    }, [quote.id]);

    const getStatusBadge = (status) => {
        const statusMap = {
            DRAFT: { label: 'Borrador', color: 'bg-slate-100 text-slate-600 border-slate-200' },
            SENT: { label: 'Enviada', color: 'bg-blue-50 text-blue-600 border-blue-200' },
            APPROVED: { label: 'Aprobada', color: 'bg-green-50 text-green-600 border-green-200' },
            REJECTED: { label: 'Rechazada', color: 'bg-red-50 text-red-600 border-red-200' },
            CONVERTED: { label: 'Convertida', color: 'bg-purple-50 text-purple-600 border-purple-200' }
        };
        const config = statusMap[status] || statusMap.DRAFT;
        return (
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
                {config.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-8 flex items-center gap-3">
                    <Loader2 className="animate-spin text-primary" />
                    <span>Cargando cotización...</span>
                </div>
            </div>
        );
    }

    const q = fullQuote || quote;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div 
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <FileText className="text-primary" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">
                                COT-{String(q.number).padStart(5, '0')}
                            </h2>
                            <p className="text-sm text-slate-500">
                                {new Date(q.date || q.createdAt).toLocaleDateString('es-VE', { 
                                    year: 'numeric', month: 'long', day: 'numeric' 
                                })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {getStatusBadge(q.status)}
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Info general */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                <User size={14} />
                                <span>Cliente</span>
                            </div>
                            <p className="font-semibold text-slate-800">{q.client?.name || 'N/A'}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                <Calendar size={14} />
                                <span>Válida hasta</span>
                            </div>
                            <p className="font-semibold text-slate-800">
                                {q.validUntil 
                                    ? new Date(q.validUntil).toLocaleDateString('es-VE') 
                                    : 'Sin vencimiento'}
                            </p>
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <h3 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
                            <Package size={16} />
                            Servicios ({q.items?.length || q._count?.items || 0})
                        </h3>
                        <div className="space-y-2">
                            {q.items?.map((item, i) => (
                                <div key={i} className="bg-slate-50 rounded-lg p-4 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-slate-800">
                                            {item.service?.name || item.description || 'Servicio'}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            {item.quantity}x @ ${parseFloat(item.unitPrice).toFixed(2)}
                                        </p>
                                    </div>
                                    <span className="font-bold text-slate-700">
                                        ${(item.quantity * parseFloat(item.unitPrice)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )) || (
                                <p className="text-slate-400 text-center py-4">Sin items detallados</p>
                            )}
                        </div>
                    </div>

                    {/* Notas */}
                    {q.notes && (
                        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                            <p className="text-sm font-medium text-amber-700 mb-1">Notas</p>
                            <p className="text-sm text-amber-900">{q.notes}</p>
                        </div>
                    )}
                </div>

                {/* Footer - Total */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-800 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <DollarSign size={20} />
                        <span className="font-medium">Total</span>
                    </div>
                    <span className="text-2xl font-bold">
                        ${parseFloat(q.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </div>
        </div>
    );
};



// Componente principal
const Quotes = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const {
        items,
        loading,
        totalItems,
        totalPages,
        page,
        setPage,
        search,
        setSearch,
        refresh,
        deleteQuote
    } = useQuotes();

    // Estados para modales
    const [viewingQuote, setViewingQuote] = useState(null);
    const [deletingQuote, setDeletingQuote] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const handleCreate = () => {
        navigate('/dashboard/cotizaciones/nuevo');
    };

    const handleView = (item) => {
        setViewingQuote(item);
    };

    const handleEdit = (item) => {
        if (item.status === 'DRAFT') {
            navigate(`/dashboard/cotizaciones/editar/${item.id}`);
        }
    };

    const handleDeleteClick = (item) => {
        if (item.status === 'DRAFT') {
            setDeletingQuote(item);
        }
    };

    const confirmDelete = async () => {
        if (!deletingQuote) return;
        setDeleteLoading(true);
        await deleteQuote(deletingQuote.id);
        setDeleteLoading(false);
        setDeletingQuote(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="text-primary" />
                        Cotizaciones
                    </h1>
                    <p className="text-slate-500 mt-1">Gestiona tus propuestas comerciales</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="bg-secondary hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all active:scale-95"
                >
                    <Plus size={20} />
                    Nueva Cotización
                </button>
            </div>

            {/* Table */}
            <EntityTable
                entityName="cotización"
                entityNamePlural="cotizaciones"
                items={items}
                columns={quoteConfig.columns}
                loading={loading}
                search={search}
                onSearchChange={setSearch}
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={setPage}
                showStatusFilter={false}
                onView={handleView}
                onEdit={(item) => item.status === 'DRAFT' ? handleEdit(item) : null}
                onDelete={(item) => item.status === 'DRAFT' ? handleDeleteClick(item) : null}
                canEdit={true}
                canDelete={true}
                showToggle={false}
                codeColor="blue"
            />

            {/* Modal de vista */}
            {viewingQuote && (
                <QuoteViewModal 
                    quote={viewingQuote} 
                    onClose={() => setViewingQuote(null)} 
                />
            )}

            {/* Modal de confirmación de eliminación */}
            <ConfirmDeleteModal
                isOpen={!!deletingQuote}
                onClose={() => setDeletingQuote(null)}
                onConfirm={confirmDelete}
                title="Eliminar Cotización"
                message="¿Estás seguro de que deseas eliminar esta cotización? Esta acción eliminará todos los items asociados."
                itemName={deletingQuote ? `COT-${String(deletingQuote.number).padStart(5, '0')} - ${deletingQuote.client?.name || 'Cliente'}` : ''}
                loading={deleteLoading}
            />
        </div>
    );
};

export default Quotes;
