import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { SettingsProvider } from './context/SettingsContext';
import Login from './pages/Login';
import Clients from './pages/clients/Clients';
import Allies from './pages/allies/Allies';
import Services from './pages/services/Services';
import Zones from './pages/zones/Zones';
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

// Componente para proteger rutas
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    
    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Cargando...</div>;
    // if (!user) return <Navigate to="/dashboard/login" />; // Ajustar ruta login según convención
    // Por ahora asumimos que auth context maneja esto o que login es public
    return user ? children : <Navigate to="/login" />;
};

function App() {
    return (
        <ToastProvider>
            <AuthProvider>
                <SettingsProvider>
                    <BrowserRouter>
                            <Routes>
                                <Route path="/login" element={<Login />} />
                                
                                {/* Rutas Protegidas con MainLayout */}
                                <Route path="/dashboard" element={
                                    <ProtectedRoute>
                                        <MainLayout>
                                            <Dashboard />
                                        </MainLayout>
                                    </ProtectedRoute>
                                } />

                                {/* Rutas de Módulos */}
                                <Route path="/dashboard/clientes" element={
                                    <ProtectedRoute>
                                        <MainLayout>
                                            <Clients />
                                        </MainLayout>
                                    </ProtectedRoute>
                                } />
                                
                                <Route path="/dashboard/aliados" element={
                                    <ProtectedRoute>
                                        <MainLayout>
                                            <Allies />
                                        </MainLayout>
                                    </ProtectedRoute>
                                } />
                                
                                <Route path="/dashboard/servicios" element={
                                    <ProtectedRoute>
                                        <MainLayout>
                                            <Services />
                                        </MainLayout>
                                    </ProtectedRoute>
                                } />
                                
                                <Route path="/dashboard/zonas" element={
                                    <ProtectedRoute>
                                        <MainLayout>
                                            <Zones />
                                        </MainLayout>
                                    </ProtectedRoute>
                                } />


                                {/* Rutas de Cobranza */}
                                <Route path="/dashboard/aviso-cobro" element={
                                    <ProtectedRoute>
                                        <MainLayout>
                                            <PaymentNotices />
                                        </MainLayout>
                                    </ProtectedRoute>
                                } />

                                <Route path="/dashboard/nota-entrega" element={
                                    <ProtectedRoute>
                                        <MainLayout>
                                            <DeliveryNotes />
                                        </MainLayout>
                                    </ProtectedRoute>
                                } />

                                <Route path="/dashboard/cx-cobrar" element={
                                    <ProtectedRoute>
                                        <MainLayout>
                                            <Receivables />
                                        </MainLayout>
                                    </ProtectedRoute>
                                } />

                                <Route path="/dashboard/embarques" element={
                                    <ProtectedRoute>
                                        <MainLayout>
                                            <Shipments />
                                        </MainLayout>
                                    </ProtectedRoute>
                                } />

                                <Route path="/dashboard/cx-pagar" element={
                                    <ProtectedRoute>
                                        <MainLayout>
                                            <Payables />
                                        </MainLayout>
                                    </ProtectedRoute>
                                } />

                                <Route path="/dashboard/balance" element={
                                    <ProtectedRoute>
                                        <MainLayout>
                                            <CashFlow />
                                        </MainLayout>
                                    </ProtectedRoute>
                                } />

                                {/* Rutas de Cotizaciones */}
                                <Route path="/dashboard/cotizaciones" element={
                                    <ProtectedRoute>
                                        <MainLayout>
                                            <Quotes />
                                        </MainLayout>
                                    </ProtectedRoute>
                                } />

                                <Route path="/dashboard/cotizaciones/nuevo" element={
                                    <ProtectedRoute>
                                        <MainLayout>
                                            <CreateQuote />
                                        </MainLayout>
                                    </ProtectedRoute>
                                } />
                                
                                {/* Rutas de Edición (futuro) */}
                                <Route path="/dashboard/cotizaciones/editar/:id" element={
                                    <ProtectedRoute>
                                        <MainLayout>
                                            <CreateQuote /> {/* Reutilizamos CreateQuote para edición */}
                                        </MainLayout>
                                    </ProtectedRoute>
                                } />
                                
                                {/* Rutas de Configuración */}
                                <Route path="/dashboard/configuracion" element={
                                    <ProtectedRoute>
                                        <MainLayout>
                                            <Settings />
                                        </MainLayout>
                                    </ProtectedRoute>
                                } />

                                <Route path="/dashboard/*" element={
                                    <ProtectedRoute>
                                        <MainLayout>
                                            <h1 className="text-2xl font-bold text-gray-400">Módulo en construcción</h1>
                                        </MainLayout>
                                    </ProtectedRoute>
                                } />
                                
                                {/* Redirección por defecto */}
                                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            </Routes>
                        </BrowserRouter>
                </SettingsProvider>
            </AuthProvider>
        </ToastProvider>
    );
}

export default App;
