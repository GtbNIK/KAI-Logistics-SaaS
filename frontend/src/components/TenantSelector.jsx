/**
 * TenantSelector - Selector de tenant en el header de la app.
 *
 * Solo se muestra si el user tiene más de 1 tenant.
 * Al cambiar de tenant: llama a switchTenant (que emite nuevo JWT y refresca /me).
 */

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTenant } from '../context/TenantContext.jsx';

export default function TenantSelector() {
    const { tenants, currentTenant, currentTenantSlug, setCurrentTenantSlug } = useTenant();
    const { switchTenant } = useAuth();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const onClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    if (!tenants || tenants.length <= 1) {
        if (!currentTenant) return null;
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-md border border-slate-700">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-sm font-medium text-white">{currentTenant.name}</span>
                <span className="text-xs text-slate-400 uppercase">{currentTenant.planKey}</span>
            </div>
        );
    }

    const handleSwitch = async (tenant) => {
        if (tenant.slug === currentTenantSlug) {
            setOpen(false);
            return;
        }
        try {
            setLoading(true);
            await switchTenant(tenant.id);
            setCurrentTenantSlug(tenant.slug);
            setOpen(false);
            // Forzar recarga de la página para refrescar todos los datos
            window.location.reload();
        } catch (err) {
            console.error('Error switching tenant:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors"
            >
                <div className={`w-2 h-2 rounded-full ${currentTenant?.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className="text-sm font-medium text-white">{currentTenant?.name || 'Seleccionar'}</span>
                <span className="text-xs text-slate-400 uppercase">{currentTenant?.planKey}</span>
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-700 text-xs uppercase tracking-wide text-slate-400">
                        Cambiar de organización
                    </div>
                    {tenants.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => handleSwitch(t)}
                            disabled={loading || t.slug === currentTenantSlug}
                            className={`w-full text-left px-3 py-2 hover:bg-slate-700 transition-colors flex items-center justify-between ${
                                t.slug === currentTenantSlug ? 'bg-slate-700/50' : ''
                            }`}
                        >
                            <div>
                                <div className="text-sm font-medium text-white">{t.name}</div>
                                <div className="text-xs text-slate-400">
                                    {t.planName || t.planKey} · {t.role}
                                </div>
                            </div>
                            {t.slug === currentTenantSlug && (
                                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
