import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';

// Componente para proteger rutas
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    
    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Cargando...</div>;
    if (!user) return <Navigate to="/login" />;
    
    return children;
};

// Layout básico del Dashboard (Placeholder)
const DashboardLayout = () => {
    const { user, logout } = useAuth();
    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="bg-primary-dark text-white p-4 flex justify-between items-center shadow-lg">
                <h1 className="font-bold text-xl">ERP Import Services</h1>
                <div className="flex items-center gap-4">
                    <span>Hola, {user?.name}</span>
                    <button 
                        onClick={logout}
                        className="bg-red-500/20 hover:bg-red-500/40 text-red-100 px-3 py-1 rounded transition-colors text-sm border border-red-500/50"
                    >
                        Salir
                    </button>
                </div>
            </nav>
            <main className="p-8">
                <h2 className="text-2xl font-bold text-slate-800">Panel Principal</h2>
                <div className="mt-4 p-6 bg-white rounded-xl shadow-sm border border-slate-100">
                    <p className="text-slate-600">Bienvenido al sistema ERP.</p>
                </div>
            </main>
        </div>
    );
};

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    
                    <Route path="/dashboard" element={
                        <ProtectedRoute>
                            <DashboardLayout />
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
