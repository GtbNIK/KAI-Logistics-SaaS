import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Settings, User, LogOut, Bell } from 'lucide-react';
import { useState } from 'react';

const Topbar = ({ toggleSidebar, isSidebarOpen }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    // Mapeo simple de rutas a títulos (esto se puede mejorar/centralizar luego)
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
        <header className="h-16 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-6 sticky top-0 z-10">
            {/* Left: Page Title */}
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-semibold text-slate-800 tracking-tight">
                    {getPageTitle(location.pathname)}
                </h1>
            </div>

            {/* Right: Actions & Profile */}
            <div className="flex items-center gap-4">
                {/* Icons */}
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
                                className="fixed inset-0 z-10" 
                                onClick={() => setShowProfileMenu(false)}
                            ></div>
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-lg shadow-slate-200/50 py-1 z-200 overflow-hidden text-sm">
                                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 md:hidden">
                                     <p className="font-medium text-slate-700">{user?.name}</p>
                                     <p className="text-xs text-slate-400 capitalize">{user?.role?.toLowerCase()}</p>
                                </div>
                                
                                <button className="w-full text-left px-4 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-primary-dark flex items-center gap-2 transition-colors">
                                    <User size={16} />
                                    Mi Perfil
                                </button>
                                
                                <div className="my-1 border-t border-slate-100"></div>
                                
                                <button 
                                    onClick={logout}
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
    );
};

export default Topbar;
