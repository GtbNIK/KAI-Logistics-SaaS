import React, { createContext, useContext, useState, useEffect } from 'react';
import settingsService from '../services/settings.service';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

const SettingsContext = createContext();

export const useSettings = () => {
    return useContext(SettingsContext);
};

const DEFAULT_SETTINGS = {
    companyName: 'Company Name',
    primaryColor: '#1F3142',
    secondaryColor: '#F28729',
    headerText: '',
    footerText: '',
    logoUrl: ''
};

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const { showSuccess, showError } = useToast();
    const { user } = useAuth();

    const fetchSettings = async () => {
        try {
            const data = await settingsService.getSettings();
            setSettings(data);
            applyTheme(data);
        } catch (error) {
            // Silenciamos el error 401 porque es normal cuando no se ha iniciado sesión
            if (error.response?.status !== 401) {
                console.error('Error loading settings:', error);
            }
            setSettings(DEFAULT_SETTINGS);
            applyTheme(DEFAULT_SETTINGS);
        } finally {
            setLoading(false);
        }
    };

    const updateSettings = async (newSettings, files = {}, removals = {}) => {
        try {
            setLoading(true);
            const updated = await settingsService.updateSettings(newSettings, files, removals);
            setSettings(updated);
            applyTheme(updated); // Apply immediately
            showSuccess('Configuración actualizada', 'Los cambios se guardaron correctamente');
            return updated;
        } catch (error) {
            console.error('Error updating settings:', error);
            showError('Error al guardar', 'No se pudo actualizar la configuración');
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const applyTheme = (themeSettings) => {
        if (!themeSettings) return;
        
        const root = document.documentElement;
        if (themeSettings.primaryColor) {
            root.style.setProperty('--color-primary-dark', hexToRgbChannels(themeSettings.primaryColor));
            root.style.setProperty('--color-primary-light', hexToRgbChannels(lightenHex(themeSettings.primaryColor, 40)));
        }
        if (themeSettings.secondaryColor) {
            root.style.setProperty('--color-secondary', hexToRgbChannels(themeSettings.secondaryColor));
        }
    };

    // Convierte "#1F3042" → "31 48 66" (canales RGB para Tailwind)
    const hexToRgbChannels = (hex) => {
        const num = parseInt(hex.replace('#', ''), 16);
        return `${(num >> 16) & 255} ${(num >> 8) & 255} ${num & 255}`;
    };

    // Aclara un color hex por un porcentaje
    const lightenHex = (hex, percent) => {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, (num >> 16) + Math.round(2.55 * percent));
        const g = Math.min(255, ((num >> 8) & 0xFF) + Math.round(2.55 * percent));
        const b = Math.min(255, (num & 0xFF) + Math.round(2.55 * percent));
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    };

    // Re-cargar settings cada vez que el usuario cambie (login/logout)
    useEffect(() => {
        if (user) {
            // Usuario autenticado: cargar settings reales de la BD
            fetchSettings();
        } else {
            // Sin usuario: cargar defaults
            setSettings(DEFAULT_SETTINGS);
            applyTheme(DEFAULT_SETTINGS);
            setLoading(false);
        }
    }, [user]);

    return (
        <SettingsContext.Provider value={{ settings, loading, updateSettings, refreshSettings: fetchSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};
