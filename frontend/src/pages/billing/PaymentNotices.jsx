import { useState, useEffect, useCallback } from 'react';
import { Receipt, Plus, Pencil } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import EntityTable from '../../components/shared/EntityTable';
import { paymentNoticeConfig } from '../../config/paymentNoticeConfig';
import PaymentNoticePDFModal from '../../components/billing/PaymentNoticePDFModal';
import NoticeDetailModal from '../../components/billing/NoticeDetailModal';
import CreateNoticeFormModal from '../../components/billing/CreateNoticeFormModal';
import ConfirmDeleteModal from '../../components/modals/ConfirmDeleteModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ─── Hook de datos ────────────────────────────────────────────────────────────
const usePaymentNotices = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const { showError } = useToast();

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search);}, 1000);
        return () => clearTimeout(t);
    }, [search]);

    const fetchNotices = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 10, search: debouncedSearch });
            const res = await axios.get(`${API_URL}/payment-notices?${params}`);
            setItems(res.data.data || []);
            setTotalItems(res.data.meta?.total || 0);
            setTotalPages(res.data.meta?.totalPages || 1);
        } catch {
            showError('Error', 'No se pudieron cargar los avisos de cobro');
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch]);

    useEffect(() => { fetchNotices(); }, [fetchNotices]);

    return { items, loading, page, setPage, totalPages, totalItems, search, setSearch, refresh: fetchNotices };
};

// ─── Página principal ─────────────────────────────────────────────────────────
const PaymentNotices = () => {
    const { user } = useAuth();
    const [viewingNotice, setViewingNotice] = useState(null);
    const [printingNotice, setPrintingNotice] = useState(null);
    const [showPDFModal, setShowPDFModal] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingNotice, setEditingNotice] = useState(null);
    const [deletingNotice, setDeletingNotice] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const { showError, showSuccess } = useToast();
    const {
        items, loading, page, setPage, totalPages, totalItems,
        search, setSearch, refresh
    } = usePaymentNotices();

    const handlePrint = async (item) => {
        try {
            const res = await axios.get(`${API_URL}/payment-notices/${item.id}`, { withCredentials: true });
            setPrintingNotice(res.data);
            setShowPDFModal(true);
        } catch (error) {
            console.error('Error loading notice for print:', error);
            showError('Error', 'No se pudo cargar el aviso para imprimir');
        }
    };

    const handleEdit = async (item) => {
        try {
            const res = await axios.get(`${API_URL}/payment-notices/${item.id}`, { withCredentials: true });
            setEditingNotice(res.data);
        } catch {
            showError('Error', 'No se pudo cargar el aviso para editar');
        }
    };

    const handleDelete = async () => {
        if (!deletingNotice) return;
        setDeleteLoading(true);
        try {
            await axios.delete(`${API_URL}/payment-notices/${deletingNotice.id}`, { withCredentials: true });
            showSuccess('Eliminado', 'Aviso de Cobro eliminado correctamente');
            setDeletingNotice(null);
            refresh();
        } catch (error) {
            showError('Error', error.response?.data?.message || 'No se pudo eliminar el aviso de cobro');
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Receipt className="text-primary" />
                        Avisos de Cobro
                    </h1>
                    <p className="text-slate-500 mt-1">Documentos de cobro generados desde cotizaciones o creados manualmente</p>
                </div>
                <button
                    onClick={() => setIsFormOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95"
                >
                    <Plus size={20} />
                    Nuevo Aviso de Cobro
                </button>
            </div>

            <EntityTable
                entityName={paymentNoticeConfig.entityName}
                entityNamePlural={paymentNoticeConfig.entityNamePlural}
                columns={paymentNoticeConfig.columns}
                items={items}
                loading={loading}
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Buscar avisos por número, cliente..."
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={setPage}
                showStatusFilter={false}
                showToggle={false}
                canEdit={user?.role === 'ADMIN'}
                canDelete={user?.role === 'ADMIN'}
                canPrint={true}
                onView={(item) => setViewingNotice(item)}
                onEdit={handleEdit}
                onPrint={handlePrint}
                onDelete={(item) => setDeletingNotice(item)}
            />

            {viewingNotice && (
                <NoticeDetailModal notice={viewingNotice} onClose={() => setViewingNotice(null)} />
            )}

            {showPDFModal && printingNotice && (
                <PaymentNoticePDFModal
                    isOpen={showPDFModal}
                    onClose={() => { setShowPDFModal(false); setPrintingNotice(null); }}
                    notice={printingNotice}
                />
            )}

            <CreateNoticeFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSuccess={refresh}
            />

            <CreateNoticeFormModal
                isOpen={!!editingNotice}
                onClose={() => setEditingNotice(null)}
                onSuccess={() => { setEditingNotice(null); refresh(); }}
                noticeToEdit={editingNotice}
            />

            {deletingNotice && (
                <ConfirmDeleteModal
                    isOpen={!!deletingNotice}
                    onClose={() => setDeletingNotice(null)}
                    onConfirm={handleDelete}
                    loading={deleteLoading}
                    title="Eliminar Aviso de Cobro"
                    message={`¿Estás seguro de eliminar el aviso AVC-${String(deletingNotice.number).padStart(5, '0')}? También se eliminará la cuenta por cobrar asociada. Esta acción no se puede deshacer.`}
                />
            )}
        </div>
    );
};

export default PaymentNotices;
