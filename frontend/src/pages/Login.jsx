import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al iniciar sesión');
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gray-900">
            {/* Background Image */}
            <div 
                className="absolute inset-0 z-0 bg-cover bg-center"
                style={{ 
                    backgroundImage: 'url("https://images.unsplash.com/photo-1494412574643-35d32468817e?q=80&w=2075&auto=format&fit=crop")', // Imagen de puerto/contenedores
                    filter: 'brightness(0.6)' // Oscurecer para mejor contraste
                }}
            />

            {/* Glassmorphism Card */}
            <div className="relative z-10 w-full max-w-md p-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl mx-4">
                
                {/* Logo & Header */}
                <div className="flex flex-col items-center mb-8">
                    <img 
                        src="/2.png" 
                        alt="Import Services Logo" 
                        className="h-20 mb-4 drop-shadow-md"
                    />
                    <div className="text-center text-white">
                        <h1 className="text-2xl font-bold tracking-wide">Import Services</h1>
                        <p className="text-blue-200 text-sm font-light tracking-widest uppercase mt-1">
                            Inicio de Sesión
                        </p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-2 rounded text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-blue-100 text-xs font-medium ml-1">Usuario</label>
                        <input
                            type="email"
                            placeholder="correo@ejemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent transition-all backdrop-blur-sm"
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-blue-100 text-xs font-medium ml-1">Contraseña</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent transition-all backdrop-blur-sm"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 px-4 bg-secondary hover:bg-orange-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-orange-500/30 transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                        Entrar
                    </button>
                </form>
            </div>
        </div>
    );
}
