import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, DollarSign, Clock, AlertCircle, Wallet, History, ChevronRight, ChevronLeft, X, RefreshCw, CreditCard, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import authService from '../../services/auth.service';
import EmployeeStatStrip from './EmployeeStatStrip';
import EmployeeHistoryPanel from './EmployeeHistoryPanel';
import RegisterPayablePaymentModal from './RegisterPayablePaymentModal';

const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return 'hoy';
    if (diffDays === 1) return 'ayer';
    if (diffDays < 7) return `hace ${diffDays} días`;
    if (diffDays < 30) return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getInitialsColor = (name) => {
    const colors = [
        'bg-blue-100 text-blue-700',
        'bg-indigo-100 text-indigo-700',
        'bg-sky-100 text-sky-700',
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

const EmployeePayrollGrid = ({ onRegisterPayment }) => {
    const { showError } = useToast();
    const [users, setUsers] = useState([]);
    const [payables, setPayables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [historyUser, setHistoryUser] = useState(null);
    const [pendingPayUser, setPendingPayUser] = useState(null);
    const [pendingPayables, setPendingPayables] = useState([]);
    const [registeringPay, setRegisteringPay] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9;

    // Debounce 800ms
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 800);
        return () => clearTimeout(t);
    }, [search]);

    // Reinicia a la primera página cuando cambia la búsqueda
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [uResult, pResult] = await Promise.allSettled([
                authService.getUsers(),
                api.get('/payables?employeeOnly=true&all=true'),
            ]);
            const allUsers = uResult.status === 'fulfilled' ? (uResult.value.users || []) : [];
            const allPayables = pResult.status === 'fulfilled' ? (pResult.value.data.data || []) : [];
            setUsers(allUsers.filter(u => u.isActive !== false));
            setPayables(allPayables.filter(p => p.employeeUserId !== null));
            if (uResult.status === 'rejected') showError('Error', 'No se pudieron cargar los empleados');
            if (pResult.status === 'rejected') showError('Error', 'No se pudieron cargar los pagos');
        } catch {
            showError('Error', 'No se pudieron cargar los datos de empleados');
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const employeeStats = useMemo(() => {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        return users.map(user => {
            const userPayables = payables.filter(p => p.employeeUserId === user.id);
            let esteMes = 0;
            let ultimoPago = null;
            let pendiente = 0;
            let pendingCount = 0;

            userPayables.forEach(p => {
                if (p.payments && p.payments.length > 0) {
                    p.payments.forEach(pmt => {
                        const pmtDate = new Date(pmt.date || pmt.createdAt);
                        if (pmtDate.getMonth() === thisMonth && pmtDate.getFullYear() === thisYear) {
                            esteMes += parseFloat(pmt.amount || 0);
                        }
                        if (!ultimoPago || pmtDate > ultimoPago) {
                            ultimoPago = pmtDate;
                        }
                    });
                }
                const balance = parseFloat(p.amount) - parseFloat(p.paidAmount || 0);
                if (p.status !== 'PAID' && balance > 0) {
                    pendiente += balance;
                    pendingCount++;
                }
            });

            return { user, userPayables, stats: { esteMes, ultimoPago, pendiente, pendingCount } };
        });
    }, [users, payables]);

    const globalStats = useMemo(() => {
        let nominaMes = 0;
        let ultimoPagoGlobal = null;
        employeeStats.forEach(({ stats }) => {
            nominaMes += stats.esteMes;
            if (stats.ultimoPago && (!ultimoPagoGlobal || stats.ultimoPago > ultimoPagoGlobal)) {
                ultimoPagoGlobal = stats.ultimoPago;
            }
        });
        return { nominaMes, ultimoPago: ultimoPagoGlobal, activos: users.length };
    }, [employeeStats, users]);

    const filteredEmployees = useMemo(() => {
        if (!debouncedSearch) return employeeStats;
        const q = debouncedSearch.toLowerCase();
        return employeeStats.filter(({ user }) =>
            user.name.toLowerCase().includes(q) ||
            (user.position || '').toLowerCase().includes(q) ||
            user.email.toLowerCase().includes(q)
        );
    }, [employeeStats, debouncedSearch]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredEmployees.length / itemsPerPage)), [filteredEmployees.length]);

    const paginatedEmployees = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredEmployees.slice(start, start + itemsPerPage);
    }, [filteredEmployees, currentPage]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-44 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    const handlePayClick = (user) => {
        const userPendings = payables.filter(
            p => p.employeeUserId === user.id && p.status !== 'PAID' && (parseFloat(p.amount) - parseFloat(p.paidAmount || 0)) > 0
        );
        if (userPendings.length > 0) {
            setPendingPayUser(user);
            setPendingPayables(userPendings);
        } else {
            onRegisterPayment({ employeeUser: user });
        }
    };

    const handlePendingPay = (payable) => {
        setPendingPayUser(null);
        setPendingPayables([]);
        setRegisteringPay(payable);
    };

    const handlePaymentDone = () => {
        setRegisteringPay(null);
        fetchData();
    };

    return (
        <div className="space-y-6">
            {/* Stats */}
            <EmployeeStatStrip
                nominaMes={globalStats.nominaMes}
                ultimoPago={globalStats.ultimoPago}
                activos={globalStats.activos}
            />

            {/* Search + Refresh */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar empleado por nombre o cargo..."
                        className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X size={14} />
                        </button>
                    )}
                </div>
                <button
                    onClick={fetchData}
                    className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                    title="Actualizar"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
                <p className="text-xs text-slate-400 ml-auto">
                    {filteredEmployees.length} de {users.length} empleados
                </p>
            </div>

            {/* Controles de paginación sutiles */}
            {filteredEmployees.length > itemsPerPage && (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Anterior"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-[11px] text-slate-400 font-medium min-w-[3rem] text-center">
                        {currentPage} / {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Siguiente"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {/* Grid de empleados */}
            {filteredEmployees.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <UsersIcon size={40} className="opacity-20 mb-3" />
                    <p className="text-sm font-medium text-slate-500">Sin resultados</p>
                    <p className="text-xs mt-1">No hay empleados que coincidan con tu búsqueda.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {paginatedEmployees.map(({ user, stats }) => (
                        <EmployeeCard
                            key={user.id}
                            user={user}
                            stats={stats}
                            onPay={() => handlePayClick(user)}
                            onHistory={() => setHistoryUser(user)}
                        />
                    ))}
                </div>
            )}

            {/* History Panel */}
            {historyUser && (
                <EmployeeHistoryPanel
                    user={historyUser}
                    payables={payables}
                    onClose={() => setHistoryUser(null)}
                    onRegisterPayment={onRegisterPayment}
                />
            )}

            {/* Pending pay action modal */}
            {pendingPayUser && (
                <PendingPayModal
                    user={pendingPayUser}
                    payables={pendingPayables}
                    onPayPending={handlePendingPay}
                    onNewSalary={() => { setPendingPayUser(null); setPendingPayables([]); onRegisterPayment({ employeeUser: pendingPayUser }); }}
                    onClose={() => { setPendingPayUser(null); setPendingPayables([]); }}
                />
            )}

            {/* Register payment for existing payable */}
            {registeringPay && (
                <RegisterPayablePaymentModal
                    payable={registeringPay}
                    onClose={() => setRegisteringPay(null)}
                    onSuccess={handlePaymentDone}
                />
            )}
        </div>
    );
};

const EmployeeCard = ({ user, stats, onPay, onHistory }) => {
    const [hovered, setHovered] = useState(false);
    const initialsColor = getInitialsColor(user.name);

    return (
        <div
            className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Top section */}
            <div className="p-5 pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-all duration-200 ${initialsColor} ${hovered ? 'scale-110' : ''}`}>
                            <span className="text-base font-bold">
                                {user.name?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-slate-800 text-sm leading-tight truncate">
                                {user.name}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {user.position || (user.role === 'ADMIN' ? 'Administrador' : 'Ventas')}
                            </p>
                        </div>
                    </div>
                    <div className="shrink-0 text-right">
                        <p className="text-xs font-bold text-blue-600">
                            ${stats.esteMes.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">este mes</p>
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div className="mx-5 h-px bg-gradient-to-r from-transparent via-slate-100 to-transparent" />

            {/* Stats row */}
            <div className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock size={12} className="shrink-0" />
                    <span>{stats.ultimoPago ? formatDate(stats.ultimoPago) : 'Sin historial'}</span>
                </div>
                {stats.pendiente > 0 ? (
                    <div className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        <AlertCircle size={11} />
                        <span>${stats.pendiente.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                ) : (
                    <span className="text-[11px] text-green-600 font-medium">Al día</span>
                )}
            </div>

            {/* Divider */}
            <div className="mx-5 h-px bg-gradient-to-r from-transparent via-slate-100 to-transparent" />

            {/* Actions */}
            <div className="p-3 flex gap-2">
                <button
                    onClick={onPay}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all active:scale-95 shadow-sm"
                >
                    <Wallet size={14} />
                    Pagar Sueldo
                </button>
                <button
                    onClick={onHistory}
                    className="flex items-center justify-center gap-1 py-2 px-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 text-xs font-medium rounded-xl transition-colors border border-slate-200 hover:border-blue-200"
                >
                    <History size={14} />
                    Historial
                    <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
            </div>
        </div>
    );
};

const UsersIcon = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

const PendingPayModal = ({ user, payables, onPayPending, onNewSalary, onClose }) => {
    if (!user || typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="font-bold text-blue-700">{user.name?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm">{user.name}</h3>
                            <p className="text-[11px] text-slate-500">{user.position || 'Empleado'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertCircle size={16} className="text-amber-500" />
                        <p className="text-sm font-medium text-slate-700">
                            Este empleado tiene <span className="font-bold text-amber-600">{payables.length}</span> cuenta(s) pendiente(s)
                        </p>
                    </div>

                    <div className="space-y-2.5 mb-5">
                        {payables.map(p => {
                            const balance = parseFloat(p.amount) - parseFloat(p.paidAmount || 0);
                            return (
                                <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="min-w-0 pr-2">
                                        <p className="text-sm font-medium text-slate-700 truncate">{p.description}</p>
                                        <p className="text-[11px] text-slate-400">
                                            CXP-{String(p.number || 0).padStart(5, '0')} · {p.status === 'PARTIALLY_PAID' ? `Abonado $${parseFloat(p.paidAmount || 0).toFixed(2)}` : 'Pendiente'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-sm font-bold text-amber-600">${balance.toFixed(2)}</span>
                                        <button
                                            onClick={() => onPayPending(p)}
                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                                        >
                                            Pagar
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-between">
                        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
                            Cancelar
                        </button>
                        <button
                            onClick={onNewSalary}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/20 flex items-center gap-2"
                        >
                            <Wallet size={15} />
                            Registrar nuevo sueldo
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default EmployeePayrollGrid;