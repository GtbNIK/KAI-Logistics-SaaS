import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Settings, LogOut, Bell, Clock, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';

// ─── Modal de Sesión por Expirar ──────────────────────────────────────────────
const SessionWarningModal = ({ isOpen, onClose, onLogout, minutesLeft }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-amber-50/50">
                    <div className="p-2 bg-amber-100 rounded-xl">
                        <AlertTriangle className="text-amber-600" size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Sesión por expirar</h3>
                        <p className="text-xs text-amber-600 font-medium">Acción requerida</p>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <p className="text-slate-600 text-sm leading-relaxed">
                        Tu sesión expirará en aproximadamente <strong className="text-amber-600">{minutesLeft} minutos</strong>.
                        Por seguridad, deberás iniciar sesión nuevamente.
                    </p>
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
                        💡 Guarda cualquier trabajo en progreso antes de que la sesión se cierre automáticamente.
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors text-sm"
                    >
                        Entendido
                    </button>
                    <button
                        onClick={onLogout}
                        className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all active:scale-95 text-sm"
                    >
                        <LogOut size={16} />
                        Cerrar Sesión Ahora
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Hook del Temporizador de Sesión ──────────────────────────────────────────
const useSessionTimer = (sessionExpiresAt, onExpired) => {
    const [secondsLeft, setSecondsLeft] = useState(null);
    const [showWarning, setShowWarning] = useState(false);
    const [warningDismissed, setWarningDismissed] = useState(false);

    useEffect(() => {
        if (!sessionExpiresAt) {
            setSecondsLeft(null);
            return;
        }

        const calculate = () => {
            const now = new Date();
            const expires = new Date(sessionExpiresAt);
            const diff = Math.max(0, Math.floor((expires - now) / 1000));
            return diff;
        };

        // Calcular inmediatamente
        setSecondsLeft(calculate());

        const interval = setInterval(() => {
            const remaining = calculate();
            setSecondsLeft(remaining);

            // 10 minutos = 600 segundos
            if (remaining <= 600 && remaining > 0 && !warningDismissed) {
                setShowWarning(true);
            }

            // Sesión expirada
            if (remaining <= 0) {
                clearInterval(interval);
                onExpired();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [sessionExpiresAt, warningDismissed, onExpired]);

    const dismissWarning = () => {
        setShowWarning(false);
        setWarningDismissed(true);
    };

    const formatTime = (totalSeconds) => {
        if (totalSeconds === null) return '--:--';
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    return { secondsLeft, formattedTime: formatTime(secondsLeft), showWarning, dismissWarning };
};

// ─── Componente Topbar ────────────────────────────────────────────────────────
const Topbar = ({ toggleSidebar, isSidebarOpen }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, forceLogout, sessionExpiresAt } = useAuth();
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    // Temporizador de sesión
    const handleSessionExpired = async () => {
        await forceLogout();
        navigate('/login', { replace: true });
    };

    const { secondsLeft, formattedTime, showWarning, dismissWarning } = useSessionTimer(
        sessionExpiresAt,
        handleSessionExpired
    );

    // Logout manual
    const handleLogout = async () => {
        setShowProfileMenu(false);
        await logout();
        navigate('/login', { replace: true });
    };

    // Determinar color del timer según urgencia
    const getTimerColor = () => {
        if (secondsLeft === null) return 'text-slate-400';
        if (secondsLeft <= 300) return 'text-red-500'; // 5 min o menos
        if (secondsLeft <= 600) return 'text-amber-500'; // 10 min o menos
        return 'text-slate-500';
    };

    // Mapeo simple de rutas a títulos
    const getPageTitle = (pathname) => {
        if (pathname === '/dashboard') return 'Resumen General';
        if (pathname.includes('/clientes')) return 'Gestión de Clientes';
        if (pathname.includes('/aliados')) return 'Gestión de Aliados';
        if (pathname.includes('/servicios')) return 'Catálogo de Servicios';
        if (pathname.includes('/zonas')) return 'Zonas de Entrega';
        if (pathname.includes('/cotizaciones')) return 'Cotizaciones';
        if (pathname.includes('/embarques')) return 'Embarques';
        if (pathname.includes('/nota-entrega')) return 'Notas de Entrega';
        if (pathname.includes('/aviso-cobro')) return 'Avisos de Cobro';
        if (pathname.includes('/cx-cobrar')) return 'Cuentas por Cobrar';
        if (pathname.includes('/cx-pagar')) return 'Cuentas por Pagar';
        if (pathname.includes('/configuracion')) return 'Configuración del Sistema';
        return 'Dashboard';
    };

    return (
        <>
            <header className="h-16 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-6 sticky top-0 z-20">
                {/* Left: Page Title */}
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-semibold text-slate-800 tracking-tight">
                        {getPageTitle(location.pathname)}
                    </h1>
                </div>

                {/* Right: Actions & Profile */}
                <div className="flex items-center gap-4">
                    {/* Temporizador de sesión */}
                    {secondsLeft !== null && (
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 ${getTimerColor()} transition-colors`}
                            title="Tiempo restante de sesión"
                        >
                            <Clock size={14} />
                            <span className="text-xs font-mono font-semibold tabular-nums">
                                {formattedTime}
                            </span>
                        </div>
                    )}

                    {/* Notificaciones */}
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors relative">
                        <Bell size={20} />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    </button>
                    
                    {/* Divider */}
                    <div className="h-6 w-px bg-slate-200 mx-1"></div>

                    {/* Config Button (Solo Admin) */}
                    {user?.role === 'ADMIN' && (
                        <button 
                            onClick={() => navigate('/dashboard/configuracion')}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium
                                ${location.pathname.startsWith('/dashboard/configuracion') 
                                    ? 'bg-primary/10 text-primary border border-primary/20' 
                                    : 'text-slate-600 hover:text-primary-dark hover:bg-slate-50'
                                }
                            `}
                            title="Configuración"
                        >
                            <Settings size={18} />
                            <span className="hidden md:inline">Configuración</span>
                        </button>
                    )}

                    {/* User Profile */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                        >
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-medium text-slate-700 leading-none">{user?.name}</p>
                                <p className="text-xs text-slate-400 mt-1 capitalize leading-none">{user?.role?.toLowerCase()}</p>
                            </div>
                            <div className="h-9 w-9 bg-primary-dark/5 rounded-full flex items-center justify-center text-primary-dark font-bold border border-primary-dark/10">
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                        </button>

                        {/* Dropdown Menu */}
                        {showProfileMenu && (
                            <>
                                <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setShowProfileMenu(false)}
                                ></div>
                                <div 
                                    className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-lg shadow-slate-200/50 py-1 z-50 overflow-hidden text-sm"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 md:hidden">
                                        <p className="font-medium text-slate-700">{user?.name}</p>
                                        <p className="text-xs text-slate-400 capitalize">{user?.role?.toLowerCase()}</p>
                                    </div>

                                    <button 
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2.5 text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                    >
                                        <LogOut size={16} />
                                        Cerrar Sesión
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Modal de advertencia de sesión */}
            <SessionWarningModal
                isOpen={showWarning}
                onClose={dismissWarning}
                onLogout={handleLogout}
                minutesLeft={secondsLeft !== null ? Math.ceil(secondsLeft / 60) : 10}
            />
        </>
    );
};

export default Topbar;
