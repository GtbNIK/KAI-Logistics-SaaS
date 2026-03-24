import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sessionExpiresAt, setSessionExpiresAt] = useState(null);

    const API_URL = import.meta.env.VITE_API_URL || '/api';

    // Configurar axios para incluir credenciales (cookies)
    axios.defaults.withCredentials = true;

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            const res = await axios.get(`${API_URL}/auth/me`);
            setUser(res.data.user);

            // Recuperar expiresAt guardado en localStorage
            const saved = localStorage.getItem('sessionExpiresAt');
            if (saved) {
                const expiresDate = new Date(saved);
                if (expiresDate > new Date()) {
                    setSessionExpiresAt(expiresDate);
                } else {
                    // Token expirado, forzar logout
                    await forceLogout();
                }
            }
        } catch (error) {
            setUser(null);
            localStorage.removeItem('sessionExpiresAt');
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const res = await axios.post(`${API_URL}/auth/login`, { email, password });
        setUser(res.data.user);

        // Guardar fecha de expiración
        if (res.data.expiresAt) {
            const expiresDate = new Date(res.data.expiresAt);
            setSessionExpiresAt(expiresDate);
            localStorage.setItem('sessionExpiresAt', res.data.expiresAt);
        }

        return res.data;
    };

    const logout = useCallback(async () => {
        try {
            await axios.post(`${API_URL}/auth/logout`);
        } catch {
            // Ignorar errores de red al cerrar sesión
        }
        setUser(null);
        setSessionExpiresAt(null);
        localStorage.removeItem('sessionExpiresAt');
    }, []);

    const forceLogout = useCallback(async () => {
        try {
            await axios.post(`${API_URL}/auth/logout`);
        } catch {
            // Ignorar errores
        }
        setUser(null);
        setSessionExpiresAt(null);
        localStorage.removeItem('sessionExpiresAt');
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, logout, forceLogout, loading, sessionExpiresAt }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
