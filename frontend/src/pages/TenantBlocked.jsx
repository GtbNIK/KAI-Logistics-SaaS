import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function TenantBlocked() {
    const [reason, setReason] = useState('SUSPENDED');
    const [message, setMessage] = useState('');

    useEffect(() => {
        try {
            const r = sessionStorage.getItem('kai:tenantBlockReason') || 'SUSPENDED';
            const m = sessionStorage.getItem('kai:tenantBlockMessage') || '';
            setReason(r);
            setMessage(m);
            sessionStorage.removeItem('kai:tenantBlockReason');
            sessionStorage.removeItem('kai:tenantBlockMessage');
        } catch (e) { void e; }
    }, []);

    const isExpired = reason === 'TENANT_EXPIRED';

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-950">
            <div className="w-full max-w-md p-8 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl mx-4 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 mb-6">
                    <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-white mb-2">
                    {isExpired ? 'Trial Vencido' : 'Acceso Bloqueado'}
                </h1>

                <p className="text-slate-300 mb-6">
                    {message || (
                        isExpired
                            ? 'Tu periodo de prueba ha terminado. Para seguir usando KAI Logistics, contacta al equipo de soporte para activar tu suscripción.'
                            : 'Este tenant está suspendido o cancelado. Contacta al administrador del sistema.'
                    )}
                </p>

                <div className="space-y-3">
                    <a
                        href="https://wa.me/584243478019?text=Hola%20KAI%20Logistics%2C%20quiero%20renovar%20mi%20suscripci%C3%B3n"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-md transition-colors"
                    >
                        Contactar por WhatsApp
                    </a>

                    <Link
                        to="/login"
                        className="block w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-md transition-colors"
                    >
                        Volver al inicio de sesión
                    </Link>
                </div>
            </div>
        </div>
    );
}