import { useState } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [requiresTotp, setRequiresTotp] = useState(false);

    const { login } = useAdminAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            setLoading(true);
            await login(email, password, totpCode || undefined);
            navigate('/admin/tenants');
        } catch (err) {
            const data = err.response?.data;
            if (data?.requiresTotp) {
                setRequiresTotp(true);
                setError('Ingresa tu código TOTP de 6 dígitos.');
            } else {
                setError(data?.message || 'Error al iniciar sesión.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-950">
            <div className="w-full max-w-md p-8 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl mx-4">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-800 mb-4">
                        <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white">KAI Control</h1>
                    <p className="text-slate-400 text-sm mt-1">Panel de administración del SaaS</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-300 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            placeholder="admin@kai.app"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                    </div>
                    {requiresTotp && (
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Código TOTP</label>
                            <input
                                type="text"
                                value={totpCode}
                                onChange={(e) => setTotpCode(e.target.value)}
                                required
                                maxLength={6}
                                pattern="[0-9]{6}"
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 tracking-widest text-center"
                                placeholder="000000"
                            />
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-700 text-slate-950 font-semibold rounded-md transition-colors"
                    >
                        {loading ? 'Verificando...' : 'Acceder'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <a href="/login" className="text-xs text-slate-500 hover:text-slate-300">
                        ← Volver al login de tenants
                    </a>
                </div>
            </div>
        </div>
    );
}
