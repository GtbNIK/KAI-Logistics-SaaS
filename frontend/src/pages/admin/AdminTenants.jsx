import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../../services/admin.service.js';

const STATUS_COLORS = {
    TRIAL: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    ACTIVE: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    PAST_DUE: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    SUSPENDED: 'bg-red-500/20 text-red-300 border-red-500/30',
    EXPIRED: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    CANCELLED: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const STATUS_LABELS = {
    TRIAL: 'Trial',
    ACTIVE: 'Activo',
    PAST_DUE: 'Pago vencido',
    SUSPENDED: 'Suspendido',
    EXPIRED: 'Trial expirado',
    CANCELLED: 'Cancelado',
};

export default function AdminTenants() {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        status: '',
        plan: '',
        search: '',
        trialExpiringSoon: false,
    });
    const [actionLoading, setActionLoading] = useState(null);

    const load = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filters.status) params.status = filters.status;
            if (filters.plan) params.plan = filters.plan;
            if (filters.search) params.search = filters.search;
            if (filters.trialExpiringSoon) params.trialExpiringSoon = 'true';
            const res = await adminService.listTenants(params);
            setTenants(res.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al cargar tenants.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [filters]);

    const handleAction = async (id, action) => {
        const actionLabels = {
            activate: 'activar',
            suspend: 'suspender',
            unsuspend: 'reactivar',
        };
        if (!window.confirm(`¿Confirmas ${actionLabels[action]} este tenant?`)) return;

        try {
            setActionLoading(`${id}-${action}`);
            if (action === 'activate') await adminService.activateTenant(id);
            else if (action === 'suspend') await adminService.suspendTenant(id);
            else if (action === 'unsuspend') await adminService.unsuspendTenant(id);
            await load();
        } catch (err) {
            alert(err.response?.data?.message || 'Error al ejecutar la acción.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleExtendTrial = async (id) => {
        const daysStr = window.prompt('¿Cuántos días extender el trial?', '7');
        if (!daysStr) return;
        const days = parseInt(daysStr, 10);
        if (isNaN(days) || days < 1 || days > 90) {
            alert('Ingresa un número entre 1 y 90.');
            return;
        }
        try {
            setActionLoading(`${id}-extend`);
            await adminService.extendTrial(id, days);
            await load();
        } catch (err) {
            alert(err.response?.data?.message || 'Error al extender el trial.');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Tenants</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        {tenants.length} tenant{tenants.length !== 1 ? 's' : ''} en el sistema
                    </p>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-4 flex flex-wrap gap-3">
                <input
                    type="text"
                    placeholder="Buscar por nombre, slug o email..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="flex-1 min-w-[200px] px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-500 text-sm"
                />
                <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm"
                >
                    <option value="">Todos los estados</option>
                    {Object.keys(STATUS_LABELS).map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                </select>
                <select
                    value={filters.plan}
                    onChange={(e) => setFilters({ ...filters, plan: e.target.value })}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm"
                >
                    <option value="">Todos los planes</option>
                    <option value="BASE">Plan Base</option>
                    <option value="PRO">Plan Pro</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-slate-300 px-3">
                    <input
                        type="checkbox"
                        checked={filters.trialExpiringSoon}
                        onChange={(e) => setFilters({ ...filters, trialExpiringSoon: e.target.checked })}
                        className="rounded"
                    />
                    Trial vence en 3 días
                </label>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-300 text-sm">
                    {error}
                </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
                        <tr>
                            <th className="text-left px-4 py-3">Tenant</th>
                            <th className="text-left px-4 py-3">Plan</th>
                            <th className="text-left px-4 py-3">Status</th>
                            <th className="text-left px-4 py-3">Uso del mes</th>
                            <th className="text-left px-4 py-3">Creado</th>
                            <th className="text-right px-4 py-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">Cargando...</td>
                            </tr>
                        ) : tenants.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No se encontraron tenants.</td>
                            </tr>
                        ) : (
                            tenants.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-800/30">
                                    <td className="px-4 py-3">
                                        <Link to={`/admin/tenants/${t.id}`} className="block">
                                            <div className="font-medium text-white">{t.name}</div>
                                            <div className="text-xs text-slate-500">{t.slug}</div>
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-slate-200">{t.plan?.name || '—'}</span>
                                        <div className="text-xs text-slate-500">${t.plan?.priceUsd || 0}/mes</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-block px-2 py-0.5 text-xs rounded border ${STATUS_COLORS[t.status]}`}>
                                            {STATUS_LABELS[t.status]}
                                        </span>
                                        {t.trialDaysRemaining !== null && t.trialDaysRemaining > 0 && (
                                            <div className="text-xs text-slate-500 mt-1">{t.trialDaysRemaining}d restantes</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-xs">
                                        <div className="text-slate-300">
                                            {t.usage?.users || 0}/{t.limits?.maxUsers || 0} users
                                        </div>
                                        <div className="text-slate-500">
                                            {t.usage?.documentsThisMonth || 0}/{t.limits?.maxDocumentsMonth || 0} docs
                                        </div>
                                        <div className="text-slate-500">
                                            {t.usage?.activeShipments || 0}/{t.limits?.maxShipmentsActive || 0} embarques
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-400">
                                        {new Date(t.createdAt).toLocaleDateString('es-VE')}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            {t.status === 'SUSPENDED' || t.status === 'CANCELLED' ? (
                                                <button
                                                    onClick={() => handleAction(t.id, 'unsuspend')}
                                                    disabled={actionLoading === `${t.id}-unsuspend`}
                                                    className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white rounded"
                                                >
                                                    Reactivar
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleAction(t.id, 'suspend')}
                                                    disabled={actionLoading === `${t.id}-suspend`}
                                                    className="px-2 py-1 text-xs bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white rounded"
                                                >
                                                    Suspender
                                                </button>
                                            )}
                                            {t.status !== 'ACTIVE' && t.status !== 'SUSPENDED' && (
                                                <button
                                                    onClick={() => handleAction(t.id, 'activate')}
                                                    disabled={actionLoading === `${t.id}-activate`}
                                                    className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white rounded"
                                                >
                                                    Activar
                                                </button>
                                            )}
                                            {t.status === 'TRIAL' || t.status === 'EXPIRED' ? (
                                                <button
                                                    onClick={() => handleExtendTrial(t.id)}
                                                    disabled={actionLoading === `${t.id}-extend`}
                                                    className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded"
                                                >
                                                    +Trial
                                                </button>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
