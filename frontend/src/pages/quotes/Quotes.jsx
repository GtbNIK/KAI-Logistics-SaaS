import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, FileText, X, Package, User, Calendar, DollarSign, Loader2, Activity } from 'lucide-react';
import quoteService from '../../services/quote.service';
import paymentNoticeService from '../../services/paymentNotice.service';
import portService from '../../services/port.service';
import EntityTable from '../../components/shared/EntityTable';
import ConfirmDeleteModal from '../../components/modals/ConfirmDeleteModal';
import ConfirmActionModal from '../../components/modals/ConfirmActionModal';
import { quoteConfig } from '../../config/quoteConfig';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import QuotePDFModal from '../../components/quotes/QuotePDFModal';
import ChangeQuoteStatusModal from '../../components/quotes/ChangeQuoteStatusModal';
import { formatQuantityLabel } from '../../utils/pricing';
import { formatCurrency } from '../../utils/currency';
import { toDateString, toVenezuelanFormat } from '../../utils/dateHelpers';

import { useAutoOpenModal } from '../../hooks/useAutoOpenModal';

// Hook personalizado para cotizaciones
const useQuotes = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filters, setFilters] = useState({});
    
    const { showError, showSuccess } = useToast();

    // Debounce: espera 1200ms tras el último cambio antes de buscar
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 1200);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchQuotes = async () => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: 10,
                search: debouncedSearch,
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
    }, [page, debouncedSearch, filters]);

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
const QuoteViewModal = ({ quote, onClose, onConvertSuccess, portsCatalog = [] }) => {
    const [loading, setLoading] = useState(true);
    const [fullQuote, setFullQuote] = useState(null);
    const [isConverting, setIsConverting] = useState(false);
    const [showConvertConfirm, setShowConvertConfirm] = useState(false);
    const { showSuccess, showError } = useToast();
    const navigate = useNavigate();

    const portCodeMap = useMemo(() => {
        const map = new Map();
        (portsCatalog || []).forEach((port) => {
            if (!port) return;
            const code = (port.code || '').trim();
            const name = (port.name || '').trim();
            if (code) {
                map.set(code.toLowerCase(), code.toUpperCase());
            }
            if (name && code) {
                map.set(name.toLowerCase(), code.toUpperCase());
            }
        });
        return map;
    }, [portsCatalog]);

    const resolvePortCode = (value) => {
        if (!value) return '';
        const str = String(value).trim();
        if (!str) return '';
        const lower = str.toLowerCase();
        if (portCodeMap.has(lower)) {
            return portCodeMap.get(lower);
        }
        if (str.includes(' - ')) {
            const possible = str.split(' - ')[0].trim();
            if (portCodeMap.has(possible.toLowerCase())) {
                return portCodeMap.get(possible.toLowerCase());
            }
            if (/^[A-Za-z0-9]{2,6}$/.test(possible)) {
                return possible.toUpperCase();
            }
        }
        if (/^[A-Za-z0-9]{2,6}$/.test(str)) {
            return str.toUpperCase();
        }
        return str;
    };

    const formatRouteLabel = (origin, destination) => {
        const originCode = resolvePortCode(origin) || 'N/A';
        const destinationCode = resolvePortCode(destination) || 'N/A';
        return `${originCode} → ${destinationCode}`;
    };

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

    const handleConvertToNotice = async () => {
        setIsConverting(true);
        try {
            await paymentNoticeService.convertFromQuote(q.id);
            showSuccess('¡Éxito!', 'Aviso de cobro generado correctamente');
            setShowConvertConfirm(false);
            if (onConvertSuccess) onConvertSuccess();
            onClose();
        } catch (error) {
            console.error('Error converting quote:', error);
            showError('Error', error.response?.data?.message || 'No se pudo generar el aviso de cobro');
            setShowConvertConfirm(false);
        } finally {
            setIsConverting(false);
        }
    };

    if (loading) {
        return createPortal(
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100]">
                <div className="bg-white rounded-2xl p-8 flex items-center gap-3">
                    <Loader2 className="animate-spin text-primary" />
                    <span>Cargando cotización...</span>
                </div>
            </div>,
            document.body
        );
    }

    const q = fullQuote || quote;

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
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
                        {q.status === 'APPROVED' && (
                            <button 
                                onClick={() => setShowConvertConfirm(true)}
                                disabled={isConverting}
                                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2 disabled:bg-slate-300"
                            >
                                {isConverting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} />
                                        <span>Generando...</span>
                                    </>
                                ) : (
                                    <>
                                        <DollarSign size={16} />
                                        <span>Generar Aviso de Cobro</span>
                                    </>
                                )}
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors ml-2">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Info general */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                <User size={14} />
                                <span>Cliente</span>
                            </div>
                            <p className="font-semibold text-slate-800">{q.client?.name || 'N/A'}</p>
                            {q.client?.rifOrId && (
                                <p className="text-xs text-slate-400">{q.client.rifOrId}</p>
                            )}
                            {q.client?.address && (
                                <p className="text-xs text-slate-400 break-words whitespace-pre-line">
                                    Dirección: {q.client.address}
                                </p>
                            )}
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                <Calendar size={14} />
                                <span>Válida hasta</span>
                            </div>
                            <p className="font-semibold text-slate-800">
                                {q.validUntil
                                    ? toVenezuelanFormat(q.validUntil)
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
                            {q.items?.map((item, i) => {
                                const serviceType = item.service?.type;
                                const isLogistics = ['FCL_20', 'FCL_40', 'FCL_40HC', 'LCL', 'DOOR_TO_DOOR'].includes(serviceType);
                                const isAir = serviceType === 'AIR';
                                const showPorts = isLogistics || isAir;
                                const shouldShowRoute = showPorts && (item.originPort || item.destinationPort);
                                const quantityLabel = formatQuantityLabel(item.quantity, serviceType);
                                
                                return (
                                    <div key={i} className="bg-slate-50 rounded-lg p-4 flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-slate-800">
                                                    {item.service?.name || item.description || 'Servicio'}
                                                </p>
                                            </div>

                                            {/* Detalle de Aliado/Línea y Ruta/Zona */}
                                            <div className="text-sm text-slate-500 flex flex-col gap-0.5">
                                                {item.ally && (
                                                    <p className="flex items-center gap-1">
                                                        <span className="font-medium text-slate-600">Aliado:</span>
                                                        {item.ally.name}
                                                    </p>
                                                )}

                                                {/* Línea Naviera o Aérea */}
                                                {isLogistics && item.shippingLine && (
                                                    <p className="flex items-center gap-1">
                                                        <span className="font-medium text-slate-600">Línea Naviera:</span>
                                                        {item.shippingLine.name}
                                                    </p>
                                                )}
                                                {isAir && item.airLine && (
                                                    <p className="flex items-center gap-1">
                                                        <span className="font-medium text-slate-600">Línea Aérea:</span>
                                                        {item.airLine.name}
                                                    </p>
                                                )}
                                                
                                                {/* Mostrar Puertos si aplica, sino Zona */}
                                                {shouldShowRoute ? (
                                                    <p className="flex items-center gap-1">
                                                        <span className="font-medium text-slate-600">Ruta:</span> 
                                                        {formatRouteLabel(item.originPort, item.destinationPort)}
                                                    </p>
                                                ) : item.zone ? (
                                                    <p className="flex items-center gap-1">
                                                        <span className="font-medium text-slate-600">Zona:</span> 
                                                        {item.zone.name}
                                                    </p>
                                                ) : null}

                                                <p className="text-slate-400 text-xs mt-1 italic">
                                                    {quantityLabel} @ {formatCurrency(parseFloat(item.unitPrice), q.currency || 'USD')}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="font-bold text-slate-700 whitespace-nowrap">
                                            {formatCurrency(parseFloat(item.totalPrice || 0), q.currency || 'USD')}
                                        </span>
                                    </div>
                                );
                            }) || (
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

                    {/* Vendedor Asignado (Movido aquí) */}
                    <div className="bg-slate-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                            <User size={14} className="text-secondary" />
                            <span>Vendedor Asignado</span>
                        </div>
                        <p className="font-semibold text-slate-800">
                            {(q.client?.assignedTo?.name) || (q.user?.name) || 'N/A'}
                        </p>
                    </div>
                </div>

                {/* Footer - Total */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-800 text-white flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2">
                        <DollarSign size={20} />
                        <span className="font-medium">Total:</span>
                    </div>
                    <span className="text-2xl font-bold">
                        {formatCurrency(parseFloat(q.totalAmount || 0), q.currency || 'USD')}
                    </span>
                </div>
            </div>

            <ConfirmActionModal
                isOpen={showConvertConfirm}
                onClose={() => setShowConvertConfirm(false)}
                onConfirm={handleConvertToNotice}
                title="Generar Aviso de Cobro"
                message={`¿Estás seguro de generar un Aviso de Cobro a partir de esta cotización (COT-${String(q.number).padStart(5, '0')})?\n\nEsta acción registrará la deuda contable en la cartera de Cuentas por Cobrar del cliente y cambiará el estado de la cotización.`}
                confirmText="Sí, generar aviso"
                loading={isConverting}
            />
        </div>,
        document.body
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
        filters,
        setFilters,
        refresh,
        deleteQuote
    } = useQuotes();

    const { showError, showSuccess } = useToast();

    // Estados para modales
    const [viewingQuote, setViewingQuote] = useState(null);
    const [deletingQuote, setDeletingQuote] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [printingQuote, setPrintingQuote] = useState(null);
    const [showPDFModal, setShowPDFModal] = useState(false);

    const [statusQuote, setStatusQuote] = useState(null);
    const [portsCatalog, setPortsCatalog] = useState([]);

    // Estados para datos necesarios en el PDF
    const [pdfData, setPdfData] = useState({
        clients: [],
        services: [],
        allies: [],
        zones: [],
        shippingLines: [],
        ports: []
    });

    // Auto-open modal if URL contains ?id=
    useAutoOpenModal(setViewingQuote);

    const mapPortsResponse = (data = []) => data.map((p) => ({ code: p.code, name: p.name }));

    const ensurePortsCatalog = useCallback(async () => {
        if (portsCatalog.length) return portsCatalog;
        try {
            const response = await portService.getPorts({ all: 'true' });
            const mapped = mapPortsResponse(response.data || []);
            setPortsCatalog(mapped);
            return mapped;
        } catch (error) {
            console.error('Error loading ports:', error);
            return [];
        }
    }, [portsCatalog.length]);

    useEffect(() => {
        ensurePortsCatalog();
    }, [ensurePortsCatalog]);

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
        if (['DRAFT', 'SENT', 'REJECTED'].includes(item.status)) {
            setDeletingQuote(item);
        }
    };

    // Cargar datos para el PDF (solo si no se han cargado)
    const loadPdfData = async () => {
        if (pdfData.clients.length > 0) return; // Ya cargados

        try {
            const [clientsRes, servicesRes, alliesRes, zonesRes, shippingLinesRes] = await Promise.all([
                (await import('../../services/client.service')).default.getClients({ limit: 100 }),
                (await import('../../services/service.service')).default.getServices({ limit: 100 }),
                (await import('../../services/ally.service')).default.getAllies({ limit: 100 }),
                (await import('../../services/zone.service')).default.getZones({ limit: 100 }),
                (await import('../../services/shippingLine.service')).default.getShippingLines({ all: 'true' })
            ]);

            const portsData = await ensurePortsCatalog();

            setPdfData({
                clients: clientsRes.data.map(c => ({ value: c.id, label: c.name, data: c })),
                services: servicesRes.data.map(s => ({ value: s.id, label: s.name, type: s.type, data: s })),
                allies: alliesRes.data.map(a => ({ value: a.id, label: a.name, data: a })),
                zones: zonesRes.data.map(z => ({ value: z.id, label: `(${z.internalCode}) ${z.name}`, data: z })),
                shippingLines: (shippingLinesRes.data || []).map(sl => ({ value: sl.id, label: sl.name, data: sl })),
                ports: portsData
            });
        } catch (error) {
            console.error('Error loading PDF data:', error);
            showError('Error', 'No se pudieron cargar los datos para imprimir');
        }
    };

    const handlePrint = async (item) => {
        // Cargar datos primero
        await loadPdfData();
        
        // Cargar detalles completos de la cotización si es necesario
        try {
             // Si el item viene de la tabla, puede no tener items completos. Mejor cargar fresh.
            const fullQuote = await quoteService.getQuote(item.id);
            setPrintingQuote(fullQuote);
            setShowPDFModal(true);
        } catch (error) {
            console.error('Error fetching quote for print:', error);
            showError('Error', 'No se pudo cargar la cotización para imprimir');
        }
    };

    const confirmDelete = async () => {
        if (!deletingQuote) return;
        setDeleteLoading(true);
        await deleteQuote(deletingQuote.id);
        setDeleteLoading(false);
        setDeletingQuote(null);
    };

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await quoteService.updateQuoteStatus(id, newStatus);
            showSuccess('¡Estado Actualizado!', 'El estado de la cotización ha sido cambiado');
            setStatusQuote(null);
            refresh();
            return true;
        } catch (error) {
            console.error('Error updating status:', error);
            showError('Error', error.response?.data?.message || 'No se pudo actualizar el estado');
            return false;
        }
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

            {/* Filtros de estado */}
            <div className="flex items-center gap-2 flex-wrap">
                {[
                    { value: '',          label: 'Todas' },
                    { value: 'DRAFT',     label: 'Borrador' },
                    { value: 'SENT',      label: 'Enviada' },
                    { value: 'APPROVED',  label: 'Aprobada' },
                    { value: 'REJECTED',  label: 'Rechazada' },
                    { value: 'CONVERTED', label: 'Convertida' },
                ].map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => setFilters(opt.value ? { status: opt.value } : {})}
                        className={`px-4 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                            (filters.status || '') === opt.value
                                ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-primary/40 hover:text-primary'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
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
                searchPlaceholder="Buscar cotizaciones por número, cliente..."
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={setPage}
                showStatusFilter={false}
                onView={handleView}
                onPrint={handlePrint}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                canEdit={(item) => item.status === 'DRAFT'}
                canDelete={(item) => item.status === 'DRAFT' || item.status === 'SENT' || item.status === 'REJECTED'}
                canPrint={true}
                showToggle={false}
                codeColor="blue"
                extraActions={(item) => {
                    const isConverted = item.status === 'CONVERTED';
                    return (
                        <button
                            className={`p-2 rounded-lg transition-colors ${
                                isConverted
                                    ? 'text-slate-200 cursor-not-allowed'
                                    : 'text-slate-400 hover:text-purple-500 hover:bg-purple-50'
                            }`}
                            title={isConverted ? 'Convertida — no editable' : 'Cambiar Estado'}
                            disabled={isConverted}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!isConverted) setStatusQuote(item);
                            }}
                        >
                            <Activity size={18} />
                        </button>
                    );
                }}
            />

            {/* Modal de vista */}
            {viewingQuote && !showPDFModal && (
                <QuoteViewModal 
                    quote={viewingQuote} 
                    onClose={() => setViewingQuote(null)}
                    onConvertSuccess={refresh}
                    portsCatalog={portsCatalog}
                />
            )}

            {/* Modal de PDF */}
            {showPDFModal && printingQuote && (
                <QuotePDFModal
                    isOpen={showPDFModal}
                    onClose={() => {
                        setShowPDFModal(false);
                        setPrintingQuote(null);
                    }}
                    quote={{
                        client: pdfData.clients.find(c => c.value === printingQuote.clientId),
                        clientName: printingQuote.client?.name,
                        user: printingQuote.user,
                        items: printingQuote.items.map(item => ({
                            ...item,
                            quantity: parseFloat(item.quantity),
                            unitPrice: parseFloat(item.unitPrice)
                        })),
                        total: printingQuote.totalAmount,
                        currency: printingQuote.currency || 'USD',
                        notes: printingQuote.notes,
                        showNotesToClient: printingQuote.showNotesToClient,
                        number: printingQuote.number,
                        validUntil: printingQuote.validUntil
                    }}
                    services={pdfData.services}
                    allies={pdfData.allies}
                    zones={pdfData.zones}
                    shippingLines={pdfData.shippingLines}
                    ports={pdfData.ports?.length ? pdfData.ports : portsCatalog}
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

            {/* Modal de cambio de estado */}
            <ChangeQuoteStatusModal
                isOpen={!!statusQuote}
                onClose={() => setStatusQuote(null)}
                quote={statusQuote}
                onUpdateStatus={handleUpdateStatus}
            />
        </div>
    );
};

export default Quotes;
