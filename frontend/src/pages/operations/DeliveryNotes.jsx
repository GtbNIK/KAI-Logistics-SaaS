import { useState, useEffect, useCallback } from 'react';
import { ScrollText, Plus, Truck, Ban, Check } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../context/ToastContext';
import EntityTable from '../../components/shared/EntityTable';
import ConfirmDeleteModal from '../../components/modals/ConfirmDeleteModal';
import { deliveryNoteConfig } from '../../config/deliveryNoteConfig';
import NoteDetailModal from '../../components/operations/NoteDetailModal';
import NoteFormModal from '../../components/operations/NoteFormModal';
import FinalizeModal from '../../components/operations/FinalizeModal';
import DeliveryNotePDFModal from '../../components/operations/DeliveryNotePDFModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ─── Hook de datos ────────────────────────────────────────────────────────────
const useDeliveryNotes = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const { showError } = useToast();

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); }, 1200);
        return () => clearTimeout(t);
    }, [search]);

    const fetchNotes = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 10, search: debouncedSearch });
            const res = await axios.get(`${API_URL}/delivery-notes?${params}`, { withCredentials: true });
            setItems(res.data.data || []);
            setTotalItems(res.data.meta?.total || 0);
            setTotalPages(res.data.meta?.totalPages || 1);
        } catch {
            showError('Error', 'No se pudieron cargar las notas de entrega');
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch]);

    useEffect(() => { fetchNotes(); }, [fetchNotes]);

    return { items, loading, page, setPage, totalPages, totalItems, search, setSearch, refresh: fetchNotes };
};

// ─── Página principal ─────────────────────────────────────────────────────────
const DeliveryNotes = () => {
    const [viewingNote, setViewingNote] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [deletingNote, setDeletingNote] = useState(null);
    const [finalizingNote, setFinalizingNote] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [printingNote, setPrintingNote] = useState(null);
    const [showPDFModal, setShowPDFModal] = useState(false);
    const { showSuccess, showError } = useToast();
    const {
        items, loading, page, setPage, totalPages, totalItems,
        search, setSearch, refresh
    } = useDeliveryNotes();

    const handlePrint = async (item) => {
        try {
            const res = await axios.get(`${API_URL}/delivery-notes/${item.id}`, { withCredentials: true });
            setPrintingNote(res.data);
            setShowPDFModal(true);
        } catch (error) {
            console.error('Error loading note for print:', error);
            showError('Error', 'No se pudo cargar la nota para imprimir');
        }
    };

    const handleEdit = (item) => {
        if (item.status !== 'DRAFT') {
            return showError('No permitido', 'Solo se pueden editar notas en estado Borrador');
        }
        setEditingNote(item);
        setIsFormOpen(true);
    };

    const handleDelete = async () => {
        if (!deletingNote) return;
        setDeleteLoading(true);
        try {
            await axios.delete(`${API_URL}/delivery-notes/${deletingNote.id}`, { withCredentials: true });
            showSuccess('Eliminada', 'Nota de entrega eliminada correctamente');
            setDeletingNote(null);
            refresh();
        } catch (err) {
            showError('Error', err.response?.data?.message || 'Error al eliminar');
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleStatusChange = async (item, newStatus) => {
        try {
            await axios.patch(`${API_URL}/delivery-notes/${item.id}/status`, { status: newStatus }, { withCredentials: true });
            showSuccess('Estado actualizado', `Nota marcada como ${newStatus === 'DISPATCHED' ? 'Despachada' : newStatus === 'CANCELLED' ? 'Cancelada' : newStatus}`);
            refresh();
        } catch (err) {
            showError('Error', err.response?.data?.message || 'Error al cambiar estado');
        }
    };

    // Acciones extra por fila según estado
    const renderExtraActions = (item) => {
        const actions = [];

        if (item.status === 'DRAFT') {
            actions.push(
                <button
                    key="dispatch"
                    onClick={(e) => { e.stopPropagation(); handleStatusChange(item, 'DISPATCHED'); }}
                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Marcar como Despachada"
                >
                    <Truck size={16} />
                </button>
            );
            actions.push(
                <button
                    key="cancel"
                    onClick={(e) => { e.stopPropagation(); handleStatusChange(item, 'CANCELLED'); }}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                    title="Cancelar nota"
                >
                    <Ban size={14} />
                </button>
            );
        }

        if (item.status === 'DISPATCHED' && !item.paymentNotice) {
            actions.push(
                <button
                    key="finalize"
                    onClick={(e) => { e.stopPropagation(); setFinalizingNote(item); }}
                    className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                    title="Confirmar Entrega (Genera Aviso de Cobro)"
                >
                    <Check size={16} />
                </button>
            );
            actions.push(
                <button
                    key="cancel2"
                    onClick={(e) => { e.stopPropagation(); handleStatusChange(item, 'CANCELLED'); }}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                    title="Cancelar nota"
                >
                    <Ban size={14} />
                </button>
            );
        }

        return actions.length > 0 ? <div className="flex gap-1">{actions}</div> : null;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <ScrollText className="text-emerald-600" />
                        Notas de Entrega
                    </h1>
                    <p className="text-slate-500 mt-1">Gestión de entregas y cierre de operaciones logísticas</p>
                </div>
                <button
                    onClick={() => { setEditingNote(null); setIsFormOpen(true); }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95"
                >
                    <Plus size={20} />
                    Nueva Nota
                </button>
            </div>

            <EntityTable
                entityName={deliveryNoteConfig.entityName}
                entityNamePlural={deliveryNoteConfig.entityNamePlural}
                columns={deliveryNoteConfig.columns}
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
                canEdit={true}
                canDelete={true}
                canPrint={true}
                onView={(item) => setViewingNote(item)}
                onEdit={handleEdit}
                onDelete={(item) => setDeletingNote(item)}
                onPrint={handlePrint}
                extraActions={renderExtraActions}
            />

            {/* Modales */}
            {viewingNote && (
                <NoteDetailModal note={viewingNote} onClose={() => setViewingNote(null)} />
            )}

            <NoteFormModal
                isOpen={isFormOpen}
                onClose={() => { setIsFormOpen(false); setEditingNote(null); }}
                onSuccess={refresh}
                editNote={editingNote}
            />

            <ConfirmDeleteModal
                isOpen={!!deletingNote}
                onClose={() => setDeletingNote(null)}
                onConfirm={handleDelete}
                title="Eliminar Nota de Entrega"
                message="¿Estás seguro de que deseas eliminar esta nota de entrega?"
                itemName={deletingNote ? `NDE-${String(deletingNote.number).padStart(5, '0')}` : ''}
                loading={deleteLoading}
            />

            <FinalizeModal
                isOpen={!!finalizingNote}
                onClose={() => setFinalizingNote(null)}
                note={finalizingNote}
                onSuccess={refresh}
            />

            {showPDFModal && printingNote && (
                <DeliveryNotePDFModal
                    isOpen={showPDFModal}
                    onClose={() => { setShowPDFModal(false); setPrintingNote(null); }}
                    note={printingNote}
                />
            )}
        </div>
    );
};

export default DeliveryNotes;
