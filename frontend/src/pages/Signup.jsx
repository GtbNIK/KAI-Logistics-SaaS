import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate, Link } from 'react-router-dom';

export default function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [planKey, setPlanKey] = useState('BASE');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { signup } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        try {
            setLoading(true);
            await signup({ email, password, name, companyName, phoneNumber, planKey });
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al crear la cuenta.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gray-900 py-12">
            <div
                className="absolute inset-0 z-0 bg-cover bg-center"
                style={{
                    backgroundImage: 'url("/fondo_login.webp")',
                    filter: 'brightness(0.6)',
                }}
            />

            <div className="relative z-10 w-full max-w-lg p-8 bg-primary-dark/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl mx-4">
                <div className="flex flex-col items-center mb-6">
                    <img src="/2.png" alt="KAI Logo" className="h-16 mb-3 drop-shadow-md" />
                    <h1 className="text-2xl font-bold tracking-wide text-white">Crear Cuenta</h1>
                    <p className="text-blue-200 text-sm font-light tracking-wide mt-1">
                        Comienza tu prueba gratuita de 10 días
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-md text-red-200 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">Tu nombre</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Juan Pérez"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">Empresa</label>
                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                required
                                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Mi Logística C.A."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-slate-800/80 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="tu@email.com"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Teléfono (opcional)</label>
                        <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800/80 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="+58 412 1234567"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Plan</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setPlanKey('BASE')}
                                className={`p-3 rounded-md border text-left ${
                                    planKey === 'BASE'
                                        ? 'bg-blue-500/20 border-blue-400'
                                        : 'bg-slate-800/80 border-slate-600'
                                }`}
                            >
                                <div className="text-sm font-semibold text-white">Plan Base</div>
                                <div className="text-xs text-slate-400">$49.99 / mes</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPlanKey('PRO')}
                                className={`p-3 rounded-md border text-left ${
                                    planKey === 'PRO'
                                        ? 'bg-blue-500/20 border-blue-400'
                                        : 'bg-slate-800/80 border-slate-600'
                                }`}
                            >
                                <div className="text-sm font-semibold text-white">Plan Pro</div>
                                <div className="text-xs text-slate-400">$64.99 / mes</div>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Mínimo 6 caracteres"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">Confirmar</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Repetir"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-md transition-colors"
                    >
                        {loading ? 'Creando cuenta...' : 'Crear cuenta y empezar trial'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-slate-400">
                    ¿Ya tienes cuenta?{' '}
                    <Link to="/login" className="text-blue-300 hover:text-blue-200 underline">
                        Inicia sesión
                    </Link>
                </div>
            </div>
        </div>
    );
}
