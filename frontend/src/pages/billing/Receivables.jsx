import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TrendingUp, Plus, Trash2, Edit } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useAutoOpenModal } from '../../hooks/useAutoOpenModal';
import EntityTable from '../../components/shared/EntityTable';
import ConfirmDeleteModal from '../../components/modals/ConfirmDeleteModal';
import receivableService from '../../services/receivable.service';
import { receivableConfig } from '../../config/receivableConfig';
import ReceivableDetailModal from '../../components/billing/ReceivableDetailModal';
import RegisterPaymentModal from '../../components/billing/RegisterPaymentModal';
import CreateReceivableModal from '../../components/billing/CreateReceivableModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ─── Hook de datos ────────────────────────────────────────────────────────────
const useReceivables = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const { showError } = useToast();

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 1000);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => { setPage(1); }, [statusFilter]);

    const fetchReceivables = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 10, search: debouncedSearch });
            if (statusFilter) params.append('status', statusFilter);
            const res = await axios.get(`${API_URL}/receivables?${params}`);
            setItems(res.data.data || []);
            setTotalItems(res.data.meta?.total || 0);
            setTotalPages(res.data.meta?.totalPages || 1);
        } catch {
            showError('Error', 'No se pudieron cargar las cuentas por cobrar');
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, statusFilter]);

    useEffect(() => { fetchReceivables(); }, [fetchReceivables]);

    return {
        items, loading, page, setPage, totalPages, totalItems,
        search, setSearch, statusFilter, setStatusFilter,
        refresh: fetchReceivables
    };
};

// ─── Página principal ─────────────────────────────────────────────────────────
const Receivables = () => {
    const [viewingReceivable, setViewingReceivable] = useState(null);
    const [registeringPayment, setRegisteringPayment] = useState(null);
    const [creatingReceivable, setCreatingReceivable] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [toDelete, setToDelete] = useState(null);
    const [editingReceivable, setEditingReceivable] = useState(null);
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const {
        items, loading, page, setPage, totalPages, totalItems,
        search, setSearch, statusFilter, setStatusFilter, refresh
    } = useReceivables();

    const totalPending = items.reduce((acc, r) => {
        if (r.status !== 'PAID') acc += parseFloat(r.totalAmount) - parseFloat(r.paidAmount || 0);
        return acc;
    }, 0);

    // Auto-open modal if URL contains ?id=
    useAutoOpenModal(setViewingReceivable, id => axios.get(`${API_URL}/receivables/${id}`));

    const handleRegisterPayment = (r) => {
        setViewingReceivable(null);
        setRegisteringPayment(r);
    };

    const statusSelect = (
        <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-500 mb-1">Por estado:</span>
            <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-700"
            >
                <option value="">Todos</option>
                <option value="PENDING">Pendiente</option>
                <option value="PARTIALLY_PAID">Abonada</option>
                <option value="PAID">Pagada</option>
            </select>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp className="text-primary" />
                        Cuentas por Cobrar
                    </h1>
                    <p className="text-slate-500 mt-1">Cartera activa de clientes con saldo pendiente</p>
                </div>
                {totalPending > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-right shrink-0">
                        <p className="text-xs text-amber-500 font-medium">Saldo pendiente en vista</p>
                        <p className="text-xl font-bold text-amber-700">
                            ${totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                )}
            </div>

            {user?.role === 'ADMIN' && (
                <div className="flex justify-end">
                    <button
                        onClick={() => setCreatingReceivable(true)}
                        className="bg-secondary hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all active:scale-95"
                    >
                        <Plus size={20} />
                        Nueva Cuenta por Cobrar
                    </button>
                </div>
            )}

            <EntityTable
                entityName={receivableConfig.entityName}
                entityNamePlural={receivableConfig.entityNamePlural}
                columns={receivableConfig.columns}
                items={items}
                loading={loading}
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Buscar CxC por número, cliente, aviso..."
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={setPage}
                showStatusFilter={false}
                showToggle={false}
                canEdit={false}
                canDelete={false}
                canPrint={false}
                extraFilters={
                    <div className="flex gap-2">
                        {statusSelect}
                    </div>
                }
                onView={(item) => setViewingReceivable(item)}
                extraActions={(item) => (
                    <div className="flex items-center gap-2">
                        <button
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar cuenta"
                            onClick={(e) => { e.stopPropagation(); setEditingReceivable(item); }}
                        >
                            <Edit size={18} />
                        </button>
                        {item.status !== 'PAID' && (
                            <button
                                className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Registrar pago"
                                onClick={(e) => { e.stopPropagation(); handleRegisterPayment(item); }}
                            >
                                <Plus size={18} />
                            </button>
                        )}
                        <button
                            className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar cuenta"
                            onClick={(e) => { e.stopPropagation(); setToDelete(item); }}
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                )}
            />

            {viewingReceivable && (
                <ReceivableDetailModal
                    receivable={viewingReceivable}
                    onClose={() => setViewingReceivable(null)}
                    onRegisterPayment={handleRegisterPayment}
                    onPaymentDeleted={refresh}
                />
            )}
            {registeringPayment && (
                <RegisterPaymentModal
                    receivable={registeringPayment}
                    onClose={() => setRegisteringPayment(null)}
                    onSuccess={refresh}
                />
            )}

            {creatingReceivable && (
                <CreateReceivableModal
                    isOpen={creatingReceivable}
                    onClose={() => setCreatingReceivable(false)}
                    onSuccess={refresh}
                />
            )}

            {editingReceivable && (
                <CreateReceivableModal
                    isOpen={!!editingReceivable}
                    onClose={() => setEditingReceivable(null)}
                    onSuccess={() => { refresh(); setEditingReceivable(null); }}
                    receivable={editingReceivable}
                />
            )}

            <ConfirmDeleteModal
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={async () => {
                    if (!toDelete) return;
                    setDeleting(true);
                    try {
                        await receivableService.deleteReceivable(toDelete.id);
                        setToDelete(null);
                        refresh();
                        showSuccess('Cuenta eliminada', 'La cuenta por cobrar y sus abonos fueron eliminados correctamente');
                    } catch (error) {
                        showError('Error', error.response?.data?.message || 'No se pudo eliminar la cuenta por cobrar');
                    } finally {
                        setDeleting(false);
                    }
                }}
                loading={deleting}
                title="Eliminar cuenta por cobrar"
                message="Se eliminarán todos los abonos asociados. Esta acción no se puede deshacer."
                itemName={toDelete ? `CXC-${String(toDelete.number || 0).padStart(5, '0')}` : ''}
            />
        </div>
    );
};

export default Receivables;
