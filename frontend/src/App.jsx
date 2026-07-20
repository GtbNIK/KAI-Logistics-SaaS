import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TenantProvider, useTenant } from './context/TenantContext.jsx';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext.jsx';
import { ToastProvider } from './context/ToastContext';
import { SettingsProvider } from './context/SettingsContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import TenantBlocked from './pages/TenantBlocked';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminTenants from './pages/admin/AdminTenants';
import AdminTenantDetail from './pages/admin/AdminTenantDetail';
import AdminPayments from './pages/admin/AdminPayments';
import AdminMetrics from './pages/admin/AdminMetrics';
import Clients from './pages/clients/Clients';
import Allies from './pages/allies/Allies';
import Services from './pages/services/Services';
import Zones from './pages/zones/Zones';
import Lines from './pages/lines/Lines';
import Rates from './pages/rates/Rates';
import Quotes from './pages/quotes/Quotes';
import CreateQuote from './pages/quotes/CreateQuote';
import PaymentNotices from './pages/billing/PaymentNotices';
import Receivables from './pages/billing/Receivables';
import DeliveryNotes from './pages/operations/DeliveryNotes';
import Settings from './pages/admin/Settings';
import Shipments from './pages/tracking/Shipments';
import Payables from './pages/finance/Payables';
import CashFlow from './pages/finance/CashFlow';
import Dashboard from './pages/Dashboard';
import MainLayout from './layouts/MainLayout';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const { currentTenant } = useTenant();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && currentTenant &&
            (currentTenant.status === 'EXPIRED' || currentTenant.status === 'CANCELLED')) {
            navigate('/blocked', { replace: true });
        }
    }, [loading, currentTenant, navigate]);

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Cargando...</div>;
    return user ? children : <Navigate to="/login" replace />;
};

const ProtectedAdminRoute = ({ children }) => {
    const { superAdmin, loading } = useAdminAuth();
    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Cargando...</div>;
    if (!superAdmin) return <Navigate to="/admin/login" replace />;
    return children;
};

function AppRoutes() {
    return (
        <Routes>
            {/* Auth publico de tenants */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/blocked" element={<TenantBlocked />} />

            {/* Panel Admin (KAI Control) */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
                path="/admin"
                element={
                    <ProtectedAdminRoute>
                        <AdminLayout />
                    </ProtectedAdminRoute>
                }
            >
                <Route index element={<Navigate to="/admin/tenants" replace />} />
                <Route path="tenants" element={<AdminTenants />} />
                <Route path="tenants/:id" element={<AdminTenantDetail />} />
                <Route path="payments" element={<AdminPayments />} />
                <Route path="metrics" element={<AdminMetrics />} />
            </Route>

            {/* Rutas Protegidas de tenants con MainLayout */}
            <Route path="/dashboard" element={
                <ProtectedRoute>
                    <MainLayout><Dashboard /></MainLayout>
                </ProtectedRoute>
            } />
            <Route path="/dashboard/clientes" element={
                <ProtectedRoute><MainLayout><Clients /></MainLayout></ProtectedRoute>
            } />
            <Route path="/dashboard/aliados" element={
                <ProtectedRoute><MainLayout><Allies /></MainLayout></ProtectedRoute>
            } />
            <Route path="/dashboard/servicios" element={
                <ProtectedRoute><MainLayout><Services /></MainLayout></ProtectedRoute>
            } />
            <Route path="/dashboard/zonas" element={
                <ProtectedRoute><MainLayout><Zones /></MainLayout></ProtectedRoute>
            } />
            <Route path="/dashboard/lineas" element={
                <ProtectedRoute><MainLayout><Lines /></MainLayout></ProtectedRoute>
            } />
            <Route path="/dashboard/tarifas" element={
                <ProtectedRoute><MainLayout><Rates /></MainLayout></ProtectedRoute>
            } />
            <Route path="/dashboard/aviso-cobro" element={
                <ProtectedRoute><MainLayout><PaymentNotices /></MainLayout></ProtectedRoute>
            } />
            <Route path="/dashboard/nota-entrega" element={
                <ProtectedRoute><MainLayout><DeliveryNotes /></MainLayout></ProtectedRoute>
            } />
            <Route path="/dashboard/cx-cobrar" element={
                <ProtectedRoute><MainLayout><Receivables /></MainLayout></ProtectedRoute>
            } />
            <Route path="/dashboard/embarques" element={
                <ProtectedRoute><MainLayout><Shipments /></MainLayout></ProtectedRoute>
            } />
            <Route path="/dashboard/cx-pagar" element={
                <ProtectedRoute><MainLayout><Payables /></MainLayout></ProtectedRoute>
            } />
            <Route path="/dashboard/balance" element={
                <ProtectedRoute><MainLayout><CashFlow /></MainLayout></ProtectedRoute>
            } />
            <Route path="/dashboard/cotizaciones" element={
                <ProtectedRoute><MainLayout><Quotes /></MainLayout></ProtectedRoute>
            } />
            <Route path="/dashboard/cotizaciones/nuevo" element={
                <ProtectedRoute><MainLayout><CreateQuote /></MainLayout></ProtectedRoute>
            } />
            <Route path="/dashboard/cotizaciones/editar/:id" element={
                <ProtectedRoute><MainLayout><CreateQuote /></MainLayout></ProtectedRoute>
            } />
            <Route path="/dashboard/configuracion" element={
                <ProtectedRoute><MainLayout><Settings /></MainLayout></ProtectedRoute>
            } />
            <Route path="/dashboard/*" element={
                <ProtectedRoute>
                    <MainLayout>
                        <h1 className="text-2xl font-bold text-gray-400">Módulo en construcción</h1>
                    </MainLayout>
                </ProtectedRoute>
            } />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <ToastProvider>
            <AdminAuthProvider>
                <TenantProvider>
                    <AuthProvider>
                        <SettingsProvider>
                            <BrowserRouter>
                                <AppRoutes />
                            </BrowserRouter>
                        </SettingsProvider>
                    </AuthProvider>
                </TenantProvider>
            </AdminAuthProvider>
        </ToastProvider>
    );
}

export default App;
