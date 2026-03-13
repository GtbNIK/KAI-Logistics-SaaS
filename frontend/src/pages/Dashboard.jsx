import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import dashboardService from '../services/dashboard.service';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
    TrendingUp, 
    FileText, 
    Ship, 
    CreditCard,
    ArrowRight,
    Users
} from 'lucide-react';
import ClosureReportButton from '../components/dashboard/ClosureReportButton';

const kpiCardClass = "bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between";
const kpiTitleClass = "text-sm font-medium text-slate-500 uppercase tracking-wide";

const DashboardInfoCard = ({ title, value, icon: Icon, colorClass, subtitle }) => (
    <div className={kpiCardClass}>
        <div className="flex justify-between items-start">
            <div>
                <p className={kpiTitleClass}>{title}</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-2">{value}</h3>
                {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
            </div>
            <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
                <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
            </div>
        </div>
    </div>
);

const PreviewTable = ({ title, icon: Icon, items, onNavigate, renderRow, emptyMessage, primaryColor }) => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Icon className="w-4 h-4 text-slate-400" />
                {title}
            </h3>
        </div>
        <div className="flex-1 overflow-auto">
            {items && items.length > 0 ? (
                <div className="divide-y divide-slate-100">
                    {items.map(renderRow)}
                </div>
            ) : (
                <div className="p-8 text-center text-slate-400 text-sm">
                    {emptyMessage || "No hay datos para mostrar."}
                </div>
            )}
        </div>
        <button 
            onClick={onNavigate}
            style={{ backgroundColor: primaryColor || '#0ea5e9', color: '#fff' }}
            className="p-3 w-full text-sm font-medium hover:brightness-110 transition-all flex items-center justify-center gap-2 mt-auto"
        >
            Ver módulo completo <ArrowRight className="w-4 h-4" />
        </button>
    </div>
);


const Dashboard = () => {
    const { user } = useAuth();
    const { settings } = useSettings();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        metrics: {
            approvedQuotesCount: 0,
            cxcPaidAmount: 0,
            pendingShipmentsCount: 0,
            cxpPendingAmount: 0
        },
        previews: {
            latestPaymentNotices: [],
            latestDeliveryNotes: [],
            topClients: []
        },
        chartData: []
    });

    const primaryColor = settings?.primaryColor || '#0ea5e9';
    const secondaryColor = settings?.secondaryColor || '#f97316';

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const summary = await dashboardService.getSummary();
                setData(summary);
            } catch (error) {
                console.error("Error al cargar el dashboard:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSummary();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: primaryColor }}></div>
            </div>
        );
    }

    const { metrics, previews, chartData } = data;

    // Formateadores
    const formatMoney = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('es-VE', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            
            {/* Cabecera y Botón de Reporte */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Resumen del Mes</h1>
                    <p className="text-slate-500 text-sm mt-1">Métricas y rendimiento de la operativa actual.</p>
                </div>
                {user?.role === 'ADMIN' && (
                    <ClosureReportButton />
                )}
            </div>

            {/* Top Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <DashboardInfoCard 
                    title="Cotizaciones Aprobadas" 
                    value={metrics.approvedQuotesCount} 
                    icon={FileText}
                    colorClass="bg-blue-500 text-blue-500"
                    subtitle="Este mes"
                />
                
                {user?.role === 'ADMIN' ? (
                    <DashboardInfoCard 
                        title="CXC Cobradas" 
                        value={formatMoney(metrics.cxcPaidAmount)} 
                        icon={TrendingUp}
                        colorClass="bg-emerald-500 text-emerald-500"
                        subtitle="Ingresos confirmados este mes"
                    />
                ) : (
                    <DashboardInfoCard 
                        title="Tus CXC Asignadas" 
                        value="Revisar" 
                        icon={TrendingUp}
                        colorClass="bg-emerald-500 text-emerald-500"
                        subtitle="Gestiona tus cobros"
                    />
                )}

                <DashboardInfoCard 
                    title="Embarques Pendientes" 
                    value={metrics.pendingShipmentsCount} 
                    icon={Ship}
                    colorClass="bg-amber-500 text-amber-500"
                    subtitle="En curso (No entregados)"
                />

                {user?.role === 'ADMIN' ? (
                    <DashboardInfoCard 
                        title="CXP Generadas" 
                        value={formatMoney(metrics.cxpPendingAmount)} 
                        icon={CreditCard}
                        colorClass="bg-rose-500 text-rose-500"
                        subtitle="Deuda Pendiente este mes"
                    />
                ) : (
                    <DashboardInfoCard 
                        title="Rendimiento Global" 
                        value="Óptimo" 
                        icon={TrendingUp}
                        colorClass="bg-primary text-primary"
                        subtitle="Métricas operativas en verde"
                    />
                )}
            </div>

            {/* Main Chart Area */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-6">Cotizaciones Creadas (Mensual)</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis 
                                dataKey="dayLabel" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 12, fill: '#64748B' }} 
                                dy={10} 
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 12, fill: '#64748B' }} 
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                cursor={{ stroke: '#CBD5E1', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />
                            <Line 
                                type="monotone" 
                                name="Cotizaciones"
                                dataKey="cotizaciones" 
                                stroke={secondaryColor} 
                                strokeWidth={3} 
                                dot={{ fill: secondaryColor, r: 4, strokeWidth: 2, stroke: '#fff' }} 
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bottom Previews Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                
                {/* Notas de Entrega Recientes */}
                <PreviewTable 
                    title="Últimas Notas de Entrega"
                    icon={FileText}
                    items={previews.latestDeliveryNotes}
                    primaryColor={primaryColor}
                    onNavigate={() => navigate('/dashboard/nota-entrega')}
                    emptyMessage="Sin notas emitidas este mes."
                    renderRow={(dn) => (
                        <div key={dn.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center cursor-pointer" onClick={() => navigate(`/dashboard/nota-entrega?id=${dn.id}`)}>
                            <div className="truncate pr-4">
                                <p className="text-sm font-medium text-slate-800 truncate" title={dn.client?.name}>{dn.client?.name || 'Cliente desconocido'}</p>
                                <p className="text-xs text-slate-500 mt-0.5">NE-{String(dn.number).padStart(5, '0')}</p>
                            </div>
                            <span className="text-xs font-medium text-slate-400 whitespace-nowrap bg-slate-100 px-2 py-1 rounded-full">{formatDate(dn.createdAt)}</span>
                        </div>
                    )}
                />

                {/* Top Clientes (x Cotizaciones aprobadas) */}
                <PreviewTable 
                    title="Top Clientes del Mes"
                    icon={Users}
                    items={previews.topClients}
                    primaryColor={primaryColor}
                    onNavigate={() => navigate('/dashboard/clientes')}
                    emptyMessage="No se han aprobado cotizaciones."
                    renderRow={(client, index) => (
                        <div key={client.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                                {index + 1}
                            </div>
                            <div className="truncate flex-1">
                                <p className="text-sm font-medium text-slate-800 truncate" title={client.name}>{client.name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{client.internalCode}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-sm font-semibold text-slate-700">{client.totalQuotes}</p>
                                <p className="text-[10px] text-slate-400 uppercase">Cotizaciones</p>
                            </div>
                        </div>
                    )}
                />

                {/* Avisos de Cobro Recientes */}
                <PreviewTable 
                    title="Últimos Avisos de Cobro"
                    icon={FileText}
                    items={previews.latestPaymentNotices}
                    primaryColor={primaryColor}
                    onNavigate={() => navigate('/dashboard/aviso-cobro')}
                    emptyMessage="Sin avisos emitidos este mes."
                    renderRow={(pn) => (
                        <div key={pn.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center cursor-pointer" onClick={() => navigate(`/dashboard/aviso-cobro?id=${pn.id}`)}>
                            <div className="truncate pr-4">
                                <p className="text-sm font-medium text-slate-800 truncate" title={pn.client?.name}>{pn.client?.name || 'Cliente desconocido'}</p>
                                <p className="text-xs text-slate-500 mt-0.5">AC-{String(pn.number).padStart(5, '0')}</p>
                            </div>
                            <span className="text-xs font-medium text-slate-400 whitespace-nowrap bg-slate-100 px-2 py-1 rounded-full">{formatDate(pn.createdAt)}</span>
                        </div>
                    )}
                />
            </div>

        </div>
    );
};

export default Dashboard;
