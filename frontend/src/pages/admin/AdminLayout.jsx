import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';

const navItemClass = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive
            ? 'bg-slate-800 text-amber-400'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`;

export default function AdminLayout() {
    const { superAdmin, logout } = useAdminAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/admin/login');
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
            <header className="bg-slate-900 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-slate-950 font-bold">K</div>
                            <div>
                                <div className="text-sm font-bold text-white">KAI Control</div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest">SaaS Admin</div>
                            </div>
                        </div>
                        <nav className="flex items-center gap-1">
                            <NavLink to="/admin/tenants" className={navItemClass}>Tenants</NavLink>
                            <NavLink to="/admin/payments" className={navItemClass}>Pagos</NavLink>
                            <NavLink to="/admin/metrics" className={navItemClass}>Métricas</NavLink>
                        </nav>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <div className="text-sm text-white">{superAdmin?.name}</div>
                            <div className="text-[11px] text-slate-500">{superAdmin?.email}</div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md"
                        >
                            Salir
                        </button>
                    </div>
                </div>
            </header>
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
                <Outlet />
            </main>
        </div>
    );
}
