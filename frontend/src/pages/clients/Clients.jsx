import { Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight, MapPin, Phone, Mail } from 'lucide-react';
import clientService from '../../services/client.service';
import { useAuth } from '../../context/AuthContext';
import ClientFormModal from '../../components/modals/ClientFormModal';
import { useState } from 'react';
import { useEffect } from 'react';

const Clients = () => {
    const { user } = useAuth();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [totalClients, setTotalClients] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const response = await clientService.getClients({ page, search, limit: 10 });
            setClients(response.data);
            setTotalClients(response.meta.total);
            setTotalPages(response.meta.last_page);
        } catch (error) {
            console.error("Error fetching clients:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            setPage(1); // Reset page on search
            fetchClients();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [search]);

    useEffect(() => {
        fetchClients();
    }, [page]);

    return (
        <div className="space-y-6">
            <ClientFormModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSuccess={fetchClients} 
            />

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Gestión de Clientes</h2>
                    <p className="text-slate-500 text-sm mt-1">Administra tu cartera de clientes y prospectos</p>
                </div>
                
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-secondary hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all active:scale-95"
                >
                    <Plus size={20} />
                    Nuevo Cliente
                </button>
            </div>

            {/* Filters & Search Card */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre, RIF o código..." 
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all text-slate-700"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                
                {/* Stats Pill */}
                <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-500 text-sm font-medium">Total Clientes:</span>
                    <span className="text-slate-800 font-bold">{totalClients}</span>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Código</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente / Empresa</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contacto</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ubicación</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-48"></div><div className="h-3 bg-slate-50 rounded w-32 mt-2"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-32"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                                        <td className="px-6 py-4"></td>
                                    </tr>
                                ))
                            ) : clients.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-3 bg-slate-50 rounded-full">
                                                <Search size={24} />
                                            </div>
                                            <p>No se encontraron clientes</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                clients.map((client) => (
                                    <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded-md border border-blue-100">
                                                {client.internalCode}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-800">{client.name}</span>
                                                <span className="text-xs text-slate-500">{client.rifOrId}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <span className="font-medium">{client.contactPerson}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                    <Mail size={12} /> {client.email}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                    <Phone size={12} /> {client.phone}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-start gap-2 max-w-[200px]">
                                                <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                                                <span className="text-sm text-slate-600 truncate">{client.address}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-2 text-slate-400 hover:text-primary-light hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                                                    <Edit size={18} />
                                                </button>
                                                {user?.role === 'ADMIN' && (
                                                    <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                    <p className="text-sm text-slate-500">
                        Mostrando página <span className="font-medium">{page}</span> de <span className="font-medium">{totalPages}</span>
                    </p>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button 
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Clients;
