import { useEffect, useState } from 'react';
import adminService from '../../services/admin.service.js';

const METHOD_LABELS = {
    PAGO_MOVIL: 'Pago Móvil',
    ZELLE: 'Zelle',
    EFECTIVO_USD: 'Efectivo USD',
    TRANSFERENCIA: 'Transferencia',
    TRANSFERENCIA_INTERNACIONAL: 'Transferencia Internacional',
    BINANCE_USDT: 'Binance USDT',
    OTRO: 'Otro',
};

export default function AdminPayments() {
    const [payments, setPayments] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        tenantId: '',
        amountUsd: '',
        method: 'PAGO_MOVIL',
        reference: '',
        notes: '',
        periodStart: new Date().toISOString().slice(0, 10),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });

    const load = async () => {
        try {
            setLoading(true);
            const [paymentsRes, tenantsRes] = await Promise.all([
                adminService.listPayments(),
                adminService.listTenants(),
            ]);
            setPayments(paymentsRes.data || []);
            setTenants(tenantsRes.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await adminService.registerPayment({
                ...form,
                amountUsd: parseFloat(form.amountUsd),
            });
            setShowModal(false);
            setForm({ ...form, amountUsd: '', reference: '', notes: '' });
            await load();
        } catch (err) {
            alert(err.response?.data?.message || 'Error al registrar el pago.');
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Pagos</h1>
                    <p className="text-sm text-slate-400 mt-1">{payments.length} pago{payments.length !== 1 ? 's' : ''} registrado{payments.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-md"
                >
                    + Registrar pago
                </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                        <tr>
                            <th className="text-left px-4 py-2">Fecha</th>
                            <th className="text-left px-4 py-2">Tenant</th>
                            <th className="text-right px-4 py-2">Monto</th>
                            <th className="text-left px-4 py-2">Método</th>
                            <th className="text-left px-4 py-2">Referencia</th>
                            <th className="text-left px-4 py-2">Confirmado por</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {loading ? (
                            <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Cargando...</td></tr>
                        ) : payments.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No hay pagos registrados.</td></tr>
                        ) : payments.map((p) => (
                            <tr key={p.id}>
                                <td className="px-4 py-2 text-slate-300">{new Date(p.createdAt).toLocaleString('es-VE')}</td>
                                <td className="px-4 py-2 text-white">{p.tenant?.name}</td>
                                <td className="px-4 py-2 text-right text-emerald-300 font-mono">${Number(p.amountUsd).toFixed(2)}</td>
                                <td className="px-4 py-2 text-slate-300">{METHOD_LABELS[p.method] || p.method}</td>
                                <td className="px-4 py-2 text-slate-400 text-xs font-mono">{p.reference || '—'}</td>
                                <td className="px-4 py-2 text-slate-400 text-xs">{p.confirmedBy?.name || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
                    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-lg font-bold text-white mb-4">Registrar pago recibido</h2>

                        <label className="block text-xs text-slate-400 mb-1">Tenant</label>
                        <select
                            value={form.tenantId}
                            onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
                            required
                            className="w-full mb-3 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                        >
                            <option value="">Selecciona...</option>
                            {tenants.map((t) => (
                                <option key={t.id} value={t.id}>{t.name} ({t.plan?.name})</option>
                            ))}
                        </select>

                        <label className="block text-xs text-slate-400 mb-1">Monto (USD)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={form.amountUsd}
                            onChange={(e) => setForm({ ...form, amountUsd: e.target.value })}
                            required
                            className="w-full mb-3 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                        />

                        <label className="block text-xs text-slate-400 mb-1">Método</label>
                        <select
                            value={form.method}
                            onChange={(e) => setForm({ ...form, method: e.target.value })}
                            className="w-full mb-3 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                        >
                            {Object.keys(METHOD_LABELS).map((m) => (
                                <option key={m} value={m}>{METHOD_LABELS[m]}</option>
                            ))}
                        </select>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Período desde</label>
                                <input
                                    type="date"
                                    value={form.periodStart}
                                    onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Período hasta</label>
                                <input
                                    type="date"
                                    value={form.periodEnd}
                                    onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                                />
                            </div>
                        </div>

                        <label className="block text-xs text-slate-400 mb-1">Referencia (opcional)</label>
                        <input
                            type="text"
                            value={form.reference}
                            onChange={(e) => setForm({ ...form, reference: e.target.value })}
                            placeholder="Nro. de operación, etc."
                            className="w-full mb-3 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                        />

                        <label className="block text-xs text-slate-400 mb-1">Notas (opcional)</label>
                        <textarea
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            rows={2}
                            className="w-full mb-4 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                        />

                        <div className="flex gap-2 justify-end">
                            <button type="button" onClick={() => setShowModal(false)} className="px-3 py-2 text-slate-300 hover:text-white text-sm">
                                Cancelar
                            </button>
                            <button type="submit" className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded text-sm">
                                Registrar
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
