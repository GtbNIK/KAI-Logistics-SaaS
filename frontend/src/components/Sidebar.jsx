import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    LayoutDashboard, 
    Users, 
    Truck, 
    Package, 
    FileText, 
    ChevronLeft, 
    ChevronRight,
    ChevronDown,
    Container,
    MapPin,
    ScrollText,
    Receipt,
    Wallet,
    TrendingDown,
    TrendingUp,
    Landmark,
    Ship,
    DollarSign
} from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const { user, logout } = useAuth();
    // Estado para controlar qué grupos están expandidos
    const [expandedGroups, setExpandedGroups] = useState({
        entidades: true,
        operaciones: true,
        finanzas: false
    });
    // Estado para controlar qué submenús están expandidos
    const [expandedSubMenus, setExpandedSubMenus] = useState({});

    const toggleSubMenu = (itemId) => {
        setExpandedSubMenus(prev => ({ ...prev, [itemId]: !prev[itemId] }));
    };

    const toggleGroup = (group) => {
        setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    const menuGroups = [
        {
            id: 'entidades',
            label: 'Entidades',
            items: [
                { to: '/dashboard/clientes', icon: Users, label: 'Clientes', roles: ['ADMIN', 'SALES'] },
                { to: '/dashboard/aliados', icon: Truck, label: 'Aliados', roles: ['ADMIN'] },
                { to: '/dashboard/servicios', icon: Package, label: 'Servicios', roles: ['ADMIN', 'SALES'] },
                { to: '/dashboard/zonas', icon: MapPin, label: 'Zonas / Puertos', roles: ['ADMIN'] },
                { to: '/dashboard/lineas', icon: Ship, label: 'Líneas de Transporte', roles: ['ADMIN'] },
                { to: '/dashboard/tarifas', icon: DollarSign, label: 'Tarifario', roles: ['ADMIN'] },
            ]
        },
        {
            id: 'operaciones',
            label: 'Operaciones',
            items: [
                { 
                    id: 'cotizaciones',
                    icon: FileText, 
                    label: 'Cotizaciones', 
                    roles: ['ADMIN', 'SALES'],
                    subItems: [
                        { to: '/dashboard/cotizaciones/nuevo', label: 'Crear Cotización' },
                        { to: '/dashboard/cotizaciones', label: 'Ver Cotizaciones' }
                    ]
                },
                { to: '/dashboard/nota-entrega', icon: ScrollText, label: 'Nota de Entrega', roles: ['ADMIN', 'SALES'] },
                { to: '/dashboard/aviso-cobro', icon: Receipt, label: 'Aviso de Cobro', roles: ['ADMIN', 'SALES'] },
                { to: '/dashboard/embarques', icon: Container, label: 'Tracking', roles: ['ADMIN', 'SALES'] },
            ]
        },
        {
            id: 'finanzas',
            label: 'Finanzas',
            items: [
                { to: '/dashboard/cx-cobrar', icon: TrendingUp,   label: 'Cuentas Por Cobrar', roles: ['ADMIN'] },
                { to: '/dashboard/cx-pagar',  icon: TrendingDown, label: 'Cuentas Por Pagar',  roles: ['ADMIN'] },
                { to: '/dashboard/balance',   icon: Landmark,     label: 'Balance',             roles: ['ADMIN'] },
            ]
        },
    ];

    // Función para verificar si el usuario tiene permiso
    const hasPermission = (roles) => {
        if (!roles) return true; // Si no define roles, es público
        return roles.includes(user?.role);
    };

    // Filtrar grupos y items
    const filteredGroups = menuGroups.map(group => {
        const filteredItems = group.items.filter(item => hasPermission(item.roles));
        return { ...group, items: filteredItems };
    }).filter(group => group.items.length > 0); 
    // Si un grupo se queda sin items (ej. Finanzas para Sales), no lo mostramos

    return (
        <aside 
            className={`
                fixed left-0 top-0 z-20 h-screen bg-primary-dark text-white transition-all duration-300 ease-in-out border-r border-white/10 flex flex-col shadow-xl
                ${isOpen ? 'w-64' : 'w-20'}
            `}
        >
            {/* Header / Logo */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 bg-black/10">
                <div className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${isOpen ? 'w-auto' : 'w-0'}`}>
                    <img src="/2.png" alt="Logo" className="h-12 w-auto min-w-[32px] object-contain" />
                </div>
                <button 
                    onClick={toggleSidebar}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                >
                    {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </button>
            </div>

            {/* Navigation Groups */}
            <div className="flex-1 py-6 px-3 space-y-6 overflow-y-auto scrollbar-hide">
                
                {/* Dashboard Home - Item suelto */}
                <NavLink
                    to="/dashboard"
                    end
                    className={({ isActive }) => `
                        flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group
                        ${isActive 
                            ? 'bg-secondary text-white shadow-lg shadow-secondary/20 font-medium' 
                            : 'text-white/70 hover:bg-white/5 hover:text-white'
                        }
                    `}
                >
                    <LayoutDashboard size={22} strokeWidth={1.5} />
                    <span className={`font-medium transition-opacity duration-200 whitespace-nowrap ${isOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
                        Inicio
                    </span>
                    {!isOpen && (
                        <div className="absolute left-16 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-md">
                            Inicio
                        </div>
                    )}
                </NavLink>

                {filteredGroups.map((group) => (
                    <div key={group.id} className="space-y-1">
                        {isOpen ? (
                            <button 
                                onClick={() => toggleGroup(group.id)}
                                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-white/30 uppercase tracking-wider hover:text-white/60 transition-colors"
                            >
                                <span>{group.label}</span>
                                <ChevronDown 
                                    size={14} 
                                    className={`transition-transform duration-200 ${expandedGroups[group.id] ? 'rotate-180' : ''}`}
                                />
                            </button>
                        ) : (
                            <div className="h-px w-8 mx-auto bg-white/5 my-4" />
                        )}

                        <div className={`space-y-1 transition-all duration-300 ${!expandedGroups[group.id] && isOpen ? 'hidden' : ''}`}>
                            {group.items.map((item) => {
                                // Caso Submenú
                                if (item.subItems) {
                                    return (
                                        <div key={item.id} className="space-y-1">
                                            <button
                                                onClick={() => isOpen && toggleSubMenu(item.id)}
                                                className={`
                                                    w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative
                                                    ${expandedSubMenus[item.id] ? 'text-white bg-white/5' : 'text-white/60 hover:bg-white/5 hover:text-white'}
                                                    ${!isOpen ? 'justify-center' : ''}
                                                `}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <item.icon size={20} strokeWidth={1.5} />
                                                    <span className={`text-sm transition-opacity duration-200 whitespace-nowrap ${isOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                                                        {item.label}
                                                    </span>
                                                </div>
                                                {isOpen && (
                                                    <ChevronDown 
                                                        size={14} 
                                                        className={`transition-transform duration-200 ${expandedSubMenus[item.id] ? 'rotate-180' : ''}`}
                                                    />
                                                )}
                                            </button>
                                            
                                            {/* SubItems List */}
                                            {isOpen && expandedSubMenus[item.id] && (
                                                <div className="pl-9 space-y-1">
                                                    {item.subItems.map(subItem => (
                                                        <NavLink
                                                            key={subItem.to}
                                                            to={subItem.to}
                                                            end
                                                            className={({ isActive }) => `
                                                                block px-3 py-2 rounded-lg text-sm transition-all duration-200
                                                                ${isActive 
                                                                    ? 'bg-white/10 text-white font-medium shadow-inner' 
                                                                    : 'text-white/50 hover:bg-white/5 hover:text-white'
                                                                }
                                                            `}
                                                        >
                                                            {subItem.label}
                                                        </NavLink>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                // Caso Normal
                                return (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) => `
                                            flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative
                                            ${isActive 
                                                ? 'bg-white/10 text-white font-medium shadow-inner' 
                                                : 'text-white/60 hover:bg-white/5 hover:text-white'
                                            }
                                            ${!isOpen ? 'justify-center' : ''}
                                        `}
                                    >
                                        <item.icon size={20} strokeWidth={1.5} />
                                        <span className={`text-sm transition-opacity duration-200 whitespace-nowrap ${isOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                                            {item.label}
                                        </span>

                                        {!isOpen && (
                                            <div className="absolute left-14 px-3 py-1.5 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-white/10 shadow-xl">
                                                {item.label}
                                            </div>
                                        )}
                                    </NavLink>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Version Info (Optional) */}
            {isOpen && (
                <div className="p-4 text-center">
                    <p className="text-[10px] text-white/20">v1.0.0 Alpha</p>
                </div>
            )}
        </aside>
    );
};

export default Sidebar;
