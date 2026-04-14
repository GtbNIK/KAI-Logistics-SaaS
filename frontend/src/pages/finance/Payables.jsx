import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TrendingDown, Plus } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useAutoOpenModal } from '../../hooks/useAutoOpenModal';
import EntityTable from '../../components/shared/EntityTable';
import { payableConfig } from '../../config/payableConfig';
import PayableDetailModal from '../../components/finance/PayableDetailModal';
import PayableFormModal from '../../components/finance/PayableFormModal';
import RegisterPayablePaymentModal from '../../components/finance/RegisterPayablePaymentModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ─── Hook de datos ────────────────────────────────────────────────────────────
const usePayables = () => {
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

    const fetchPayables = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 10, search: debouncedSearch });
            if (statusFilter) params.append('status', statusFilter);
            const res = await axios.get(`${API_URL}/payables?${params}`);
            setItems(res.data.data || []);
            setTotalItems(res.data.meta?.total || 0);
            setTotalPages(res.data.meta?.totalPages || 1);
        } catch {
            showError('Error', 'No se pudieron cargar las cuentas por pagar');
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, statusFilter]);

    useEffect(() => { fetchPayables(); }, [fetchPayables]);

    return {
        items, loading, page, setPage, totalPages, totalItems,
        search, setSearch, statusFilter, setStatusFilter,
        refresh: fetchPayables
    };
};

// ─── Página principal ─────────────────────────────────────────────────────────
const Payables = () => {
    const [viewingPayable, setViewingPayable] = useState(null);
    const [registeringPayment, setRegisteringPayment] = useState(null);
    const [creatingPayable, setCreatingPayable] = useState(false);
    const { user } = useAuth();
    const {
        items, loading, page, setPage, totalPages, totalItems,
        search, setSearch, statusFilter, setStatusFilter, refresh
    } = usePayables();

    const totalPending = items.reduce((acc, p) => {
        if (p.status !== 'PAID') acc += parseFloat(p.amount) - parseFloat(p.paidAmount || 0);
        return acc;
    }, 0);

    // Auto-open modal if URL contains ?id=
    useAutoOpenModal(setViewingPayable, id => axios.get(`${API_URL}/payables/${id}`));

    const handleRegisterPayment = (p) => {
        setViewingPayable(null);
        setRegisteringPayment(p);
    };

    const statusSelect = (
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
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <TrendingDown className="text-red-500" />
                        Cuentas por Pagar
                    </h1>
                    <p className="text-slate-500 mt-1">Deudas pendientes con aliados y proveedores</p>
                </div>
                {totalPending > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-right shrink-0">
                        <p className="text-xs text-red-500 font-medium">Saldo pendiente en vista</p>
                        <p className="text-xl font-bold text-red-700">
                            ${totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                )}
            </div>

            {user?.role === 'ADMIN' && (
                <div className="flex justify-end">
                    <button
                        onClick={() => setCreatingPayable(true)}
                        className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-red-500/20 flex items-center gap-2 transition-all active:scale-95"
                    >
                        <Plus size={20} />
                        Nueva Cuenta por Pagar
                    </button>
                </div>
            )}

            <EntityTable
                entityName={payableConfig.entityName}
                entityNamePlural={payableConfig.entityNamePlural}
                columns={payableConfig.columns}
                items={items}
                loading={loading}
                search={search}
                onSearchChange={setSearch}
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={setPage}
                showStatusFilter={false}
                showToggle={false}
                canEdit={false}
                canDelete={false}
                canPrint={false}
                extraFilters={statusSelect}
                onView={(item) => setViewingPayable(item)}
                extraActions={(item) => item.status !== 'PAID' && (
                    <button
                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Registrar pago"
                        onClick={(e) => { e.stopPropagation(); handleRegisterPayment(item); }}
                    >
                        <Plus size={18} />
                    </button>
                )}
            />

            {viewingPayable && (
                <PayableDetailModal
                    payable={viewingPayable}
                    onClose={() => setViewingPayable(null)}
                    onRegisterPayment={handleRegisterPayment}
                />
            )}
            {registeringPayment && (
                <RegisterPayablePaymentModal
                    payable={registeringPayment}
                    onClose={() => setRegisteringPayment(null)}
                    onSuccess={refresh}
                />
            )}

            {creatingPayable && (
                <PayableFormModal
                    isOpen={creatingPayable}
                    onClose={() => setCreatingPayable(false)}
                    onSuccess={refresh}
                />
            )}
        </div>
    );
};

export default Payables;
