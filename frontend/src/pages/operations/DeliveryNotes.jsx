import { useState, useEffect, useCallback } from 'react';
import { ScrollText, Plus, Truck, Ban } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import EntityTable from '../../components/shared/EntityTable';
import ConfirmDeleteModal from '../../components/modals/ConfirmDeleteModal';
import ConfirmActionModal from '../../components/modals/ConfirmActionModal';
import { deliveryNoteConfig } from '../../config/deliveryNoteConfig';
import NoteDetailModal from '../../components/operations/NoteDetailModal';
import NoteFormModal from '../../components/operations/NoteFormModal';
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
    const [statusFilter, setStatusFilter] = useState('');
    const { showError } = useToast();

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); }, 1000);
        return () => clearTimeout(t);
    }, [search]);

    const fetchNotes = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 10, search: debouncedSearch });
            if (statusFilter) params.set('status', statusFilter);
            const res = await axios.get(`${API_URL}/delivery-notes?${params}`, { withCredentials: true });
            setItems(res.data.data || []);
            setTotalItems(res.data.meta?.total || 0);
            setTotalPages(res.data.meta?.totalPages || 1);
        } catch {
            showError('Error', 'No se pudieron cargar las notas de entrega');
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, statusFilter]);

    useEffect(() => { fetchNotes(); }, [fetchNotes]);

    return { items, loading, page, setPage, totalPages, totalItems, search, setSearch, statusFilter, setStatusFilter, refresh: fetchNotes };
};

// ─── Página principal ─────────────────────────────────────────────────────────
const DeliveryNotes = () => {
    const [viewingNote, setViewingNote] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [deletingNote, setDeletingNote] = useState(null);
	const [confirmingAction, setConfirmingAction] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [printingNote, setPrintingNote] = useState(null);
    const [showPDFModal, setShowPDFModal] = useState(false);
    const { showSuccess, showError } = useToast();
    const { user } = useAuth ? useAuth() : { user: null };
    const {
        items, loading, page, setPage, totalPages, totalItems,
        search, setSearch, statusFilter, setStatusFilter, refresh
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

	const requestStatusChange = (item, newStatus) => {
		setConfirmingAction({ item, newStatus });
	};

    // Acciones extra por fila según estado
    const renderExtraActions = (item) => {
        const actions = [];

        if (item.status === 'DRAFT') {
            actions.push(
                <button
                    key="dispatch"
					onClick={(e) => { e.stopPropagation(); requestStatusChange(item, 'DISPATCHED'); }}
                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Marcar como Despachada"
                >
                    <Truck size={16} />
                </button>
            );
            actions.push(
                <button
                    key="cancel"
					onClick={(e) => { e.stopPropagation(); requestStatusChange(item, 'CANCELLED'); }}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                    title="Cancelar nota"
                >
                    <Ban size={14} />
                </button>
            );
        }

        if (item.status === 'DISPATCHED') {
            
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
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { setEditingNote(null); setIsFormOpen(true); }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95"
                    >
                        <Plus size={20} />
                        Nueva Nota
                    </button>
                </div>
            </div>

            <EntityTable
                entityName={deliveryNoteConfig.entityName}
                entityNamePlural={deliveryNoteConfig.entityNamePlural}
                columns={deliveryNoteConfig.columns}
                items={items}
                loading={loading}
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Buscar notas por número, cliente..."
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={setPage}
                showStatusFilter={false}
                showToggle={false}
                canEdit={true}
                canDelete={(item) => (user?.role === 'ADMIN') && item.status !== 'DISPATCHED'}
                canPrint={true}
                onView={(item) => setViewingNote(item)}
                onEdit={handleEdit}
                onDelete={(item) => setDeletingNote(item)}
                onPrint={handlePrint}
                extraActions={renderExtraActions}
                extraFilters={(
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-500 mb-1">Por estado:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all text-slate-700"
                        >
                            {deliveryNoteConfig.statusFilterOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                )}
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

			<ConfirmActionModal
				isOpen={!!confirmingAction}
				onClose={() => setConfirmingAction(null)}
				onConfirm={async () => {
					if (!confirmingAction) return;
					await handleStatusChange(confirmingAction.item, confirmingAction.newStatus);
					setConfirmingAction(null);
				}}
				title={confirmingAction?.newStatus === 'DISPATCHED' ? 'Marcar como Despachada' : 'Cancelar Nota de Entrega'}
				message={confirmingAction?.newStatus === 'DISPATCHED'
					? `¿Confirmas que deseas marcar esta nota como Despachada?\n\nNDE-${String(confirmingAction?.item?.number || '').padStart(5, '0')}`
					: `¿Confirmas que deseas cancelar esta nota de entrega?\n\nNDE-${String(confirmingAction?.item?.number || '').padStart(5, '0')}`
				}
				confirmText={confirmingAction?.newStatus === 'DISPATCHED' ? 'Sí, despachar' : 'Sí, cancelar'}
				cancelText="Volver"
				isWarning={true}
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
