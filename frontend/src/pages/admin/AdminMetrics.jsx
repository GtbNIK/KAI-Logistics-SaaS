import { useEffect, useState } from 'react';
import adminService from '../../services/admin.service.js';

export default function AdminMetrics() {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [workerResult, setWorkerResult] = useState(null);

    const load = async () => {
        try {
            setLoading(true);
            const res = await adminService.getMetrics();
            setMetrics(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const runWorker = async (jobName) => {
        try {
            setWorkerResult(null);
            const res = await adminService.runWorker(jobName);
            setWorkerResult({ jobName, data: res.data });
        } catch (err) {
            setWorkerResult({ jobName, error: err.response?.data?.message || err.message });
        }
    };

    if (loading) return <div className="text-slate-400">Cargando métricas...</div>;
    if (!metrics) return null;

    return (
        <div>
            <h1 className="text-2xl font-bold text-white mb-6">Métricas del SaaS</h1>

            <div className="grid grid-cols-4 gap-4 mb-6">
                <StatCard label="Total Tenants" value={metrics.totalTenants} />
                <StatCard label="Pagando" value={metrics.activePaidTenants} color="text-emerald-300" />
                <StatCard label="MRR (USD)" value={`$${metrics.mrrUsd.toFixed(2)}`} color="text-amber-300" />
                <StatCard
                    label="Pagos del mes"
                    value={`$${metrics.paymentsThisMonth.totalUsd.toFixed(2)}`}
                    subValue={`${metrics.paymentsThisMonth.count} pagos`}
                />
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-white mb-3">Por estado</h3>
                    <div className="space-y-2">
                        {Object.entries(metrics.tenantsByStatus).map(([status, count]) => (
                            <div key={status} className="flex items-center justify-between text-sm">
                                <span className="text-slate-300">{status}</span>
                                <span className="text-white font-mono">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-white mb-3">Por plan</h3>
                    <div className="space-y-2">
                        {metrics.tenantsByPlan.map((p) => (
                            <div key={p.planId} className="flex items-center justify-between text-sm">
                                <span className="text-slate-300">{p.planName}</span>
                                <span className="text-white font-mono">{p.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {metrics.trialsExpiringSoon?.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-semibold text-amber-300 mb-2">⚠ Trials por vencer (próximos 3 días)</h3>
                    <ul className="space-y-1 text-sm">
                        {metrics.trialsExpiringSoon.map((t) => (
                            <li key={t.id} className="text-amber-200">
                                {t.name} ({t.slug}) — vence {new Date(t.trialEndsAt).toLocaleDateString('es-VE')}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Workers (cron jobs)</h3>
                <div className="space-y-2 mb-3">
                    {Object.entries(metrics.workersStatus).map(([name, status]) => (
                        <div key={name} className="flex items-center justify-between text-sm">
                            <div>
                                <span className="text-slate-300 font-mono">{name}</span>
                                {status.lastRun && (
                                    <span className="text-slate-500 text-xs ml-2">
                                        último: {new Date(status.lastRun).toLocaleString('es-VE')}
                                    </span>
                                )}
                                {status.lastError && (
                                    <span className="text-red-400 text-xs ml-2">⚠ {status.lastError}</span>
                                )}
                            </div>
                            <button
                                onClick={() => runWorker(name)}
                                className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded"
                            >
                                Ejecutar ahora
                            </button>
                        </div>
                    ))}
                </div>
                {workerResult && (
                    <div className="mt-3 p-2 bg-slate-800/50 rounded text-xs text-slate-300">
                        <div className="font-semibold mb-1">Resultado de {workerResult.jobName}:</div>
                        <pre className="overflow-x-auto">{JSON.stringify(workerResult.data || workerResult.error, null, 2)}</pre>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, subValue, color = 'text-white' }) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-xs uppercase text-slate-500 tracking-wide">{label}</div>
            <div className={`text-2xl font-bold ${color} mt-1`}>{value}</div>
            {subValue && <div className="text-xs text-slate-500 mt-1">{subValue}</div>}
        </div>
    );
}
