import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Clients from './pages/clients/Clients';
import Allies from './pages/allies/Allies';
import Services from './pages/services/Services';

// Componente para proteger rutas
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    
    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Cargando...</div>;
    if (!user) return <Navigate to="/login" />;
    
    return children;
};

import MainLayout from './layouts/MainLayout';

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    
                    {/* Rutas Protegidas con MainLayout */}
                    <Route path="/dashboard" element={
                        <ProtectedRoute>
                            <MainLayout>
                                {/* Placeholder para el Home del Dashboard */}
                                <h1 className="text-2xl font-bold text-primary-dark">Bienvenido al Dashboard</h1>
                                <p className="text-slate-600 mt-2">Selecciona un módulo del menú lateral para comenzar.</p>
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
                    
                    {/* Placeholder para otros módulos */}
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
        </AuthProvider>
    );
}

export default App;
