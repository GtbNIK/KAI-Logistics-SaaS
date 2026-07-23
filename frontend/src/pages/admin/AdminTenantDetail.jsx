import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import adminService from '../../services/admin.service.js';

const STATUS_LABELS = {
    TRIAL: 'Trial',
    ACTIVE: 'Activo',
    PAST_DUE: 'Pago vencido',
    SUSPENDED: 'Suspendido',
    EXPIRED: 'Trial expirado',
    CANCELLED: 'Cancelado',
};

const ROLE_LABELS = {
    OWNER: 'Dueño',
    ADMIN: 'Admin',
    SALES: 'Ventas',
    OPERATOR: 'Operador',
    VIEWER: 'Solo lectura',
};

export default function AdminTenantDetail() {
    const { id } = useParams();
    const [tenant, setTenant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('general');

    const load = async () => {
        try {
            setLoading(true);
            const res = await adminService.getTenant(id);
            setTenant(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [id]);

    if (loading) return <div className="text-slate-400">Cargando...</div>;
    if (!tenant) return <div className="text-slate-400">Tenant no encontrado.</div>;

    return (
        <div>
            <div className="mb-6">
                <Link to="/admin/tenants" className="text-sm text-slate-400 hover:text-slate-200">← Volver</Link>
                <h1 className="text-2xl font-bold text-white mt-2">{tenant.name}</h1>
                <p className="text-sm text-slate-400">slug: {tenant.slug} · {tenant.plan?.name} · {STATUS_LABELS[tenant.status]}</p>
            </div>

            <div className="border-b border-slate-800 mb-6 flex gap-4">
                {['general', 'members', 'payments', 'usage'].map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                            tab === t
                                ? 'border-amber-400 text-amber-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        {t === 'general' && 'General'}
                        {t === 'members' && `Miembros (${tenant.memberships?.length || 0})`}
                        {t === 'payments' && `Pagos (${tenant.payments?.length || 0})`}
                        {t === 'usage' && 'Uso y Límites'}
                    </button>
                ))}
            </div>

            {tab === 'general' && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                        <h3 className="text-xs uppercase text-slate-500 mb-3">Información</h3>
                        <dl className="space-y-2 text-sm">
                            <div className="flex justify-between"><dt className="text-slate-400">ID:</dt><dd className="text-white font-mono text-xs">{tenant.id}</dd></div>
                            <div className="flex justify-between"><dt className="text-slate-400">Slug:</dt><dd className="text-white">{tenant.slug}</dd></div>
                            <div className="flex justify-between"><dt className="text-slate-400">Plan:</dt><dd className="text-white">{tenant.plan?.name}</dd></div>
                            <div className="flex justify-between"><dt className="text-slate-400">Status:</dt><dd className="text-white">{STATUS_LABELS[tenant.status]}</dd></div>
                            <div className="flex justify-between"><dt className="text-slate-400">Trial Ends:</dt><dd className="text-white">{tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleDateString('es-VE') : '—'}</dd></div>
                            <div className="flex justify-between"><dt className="text-slate-400">Creado:</dt><dd className="text-white">{new Date(tenant.createdAt).toLocaleDateString('es-VE')}</dd></div>
                        </dl>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                        <h3 className="text-xs uppercase text-slate-500 mb-3">Suscripción</h3>
                        {tenant.subscription ? (
                            <dl className="space-y-2 text-sm">
                                <div className="flex justify-between"><dt className="text-slate-400">Status:</dt><dd className="text-white">{tenant.subscription.status}</dd></div>
                                <div className="flex justify-between"><dt className="text-slate-400">Inicio:</dt><dd className="text-white">{new Date(tenant.subscription.currentPeriodStart).toLocaleDateString('es-VE')}</dd></div>
                                <div className="flex justify-between"><dt className="text-slate-400">Fin:</dt><dd className="text-white">{new Date(tenant.subscription.currentPeriodEnd).toLocaleDateString('es-VE')}</dd></div>
                            </dl>
                        ) : (
                            <p className="text-slate-400 text-sm">Sin suscripción.</p>
                        )}
                    </div>
                </div>
            )}

            {tab === 'members' && (
                <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                            <tr>
                                <th className="text-left px-4 py-2">Nombre</th>
                                <th className="text-left px-4 py-2">Email</th>
                                <th className="text-left px-4 py-2">Rol</th>
                                <th className="text-left px-4 py-2">Status</th>
                                <th className="text-left px-4 py-2">Último login</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {tenant.memberships?.map((m) => (
                                <tr key={m.id}>
                                    <td className="px-4 py-2 text-white">{m.user.name}</td>
                                    <td className="px-4 py-2 text-slate-300">{m.user.email}</td>
                                    <td className="px-4 py-2 text-slate-300">{ROLE_LABELS[m.role] || m.role}</td>
                                    <td className="px-4 py-2">
                                        <span className={`text-xs px-2 py-0.5 rounded ${m.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-slate-300'}`}>
                                            {m.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-slate-400 text-xs">
                                        {m.user.lastLoginAt ? new Date(m.user.lastLoginAt).toLocaleString('es-VE') : 'Nunca'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'payments' && (
                <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                            <tr>
                                <th className="text-left px-4 py-2">Fecha</th>
                                <th className="text-left px-4 py-2">Monto</th>
                                <th className="text-left px-4 py-2">Método</th>
                                <th className="text-left px-4 py-2">Referencia</th>
                                <th className="text-left px-4 py-2">Período</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {tenant.payments?.length > 0 ? (
                                tenant.payments.map((p) => (
                                    <tr key={p.id}>
                                        <td className="px-4 py-2 text-slate-300">{new Date(p.createdAt).toLocaleDateString('es-VE')}</td>
                                        <td className="px-4 py-2 text-white">${p.amountUsd}</td>
                                        <td className="px-4 py-2 text-slate-300">{p.method}</td>
                                        <td className="px-4 py-2 text-slate-400 text-xs">{p.reference || '—'}</td>
                                        <td className="px-4 py-2 text-slate-400 text-xs">
                                            {new Date(p.periodStart).toLocaleDateString('es-VE')} → {new Date(p.periodEnd).toLocaleDateString('es-VE')}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Sin pagos registrados.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'usage' && (
                <div className="grid grid-cols-3 gap-4">
                    <UsageCard label="Usuarios" current={tenant.usage?.users || 0} max={tenant.limits?.maxUsers || 0} />
                    <UsageCard label="Documentos (mes)" current={tenant.usage?.documentsThisMonth || 0} max={tenant.limits?.maxDocumentsMonth || 0} />
                    <UsageCard label="Embarques activos" current={tenant.usage?.activeShipments || 0} max={tenant.limits?.maxShipmentsActive || 0} />
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 col-span-3">
                        <div className="text-xs uppercase text-slate-500 mb-2">Acumulado del tenant</div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><span className="text-slate-400">Clientes totales:</span> <span className="text-white">{tenant.usage?.totalClients || 0}</span></div>
                            <div><span className="text-slate-400">Aliados totales:</span> <span className="text-white">{tenant.usage?.totalAllies || 0}</span></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function UsageCard({ label, current, max }) {
    const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
    const color = pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500';
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-xs uppercase text-slate-500 mb-1">{label}</div>
            <div className="text-2xl font-bold text-white mb-2">{current} <span className="text-sm text-slate-500 font-normal">/ {max}</span></div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <div className="text-xs text-slate-500 mt-1">{pct}% del límite</div>
        </div>
    );
}
