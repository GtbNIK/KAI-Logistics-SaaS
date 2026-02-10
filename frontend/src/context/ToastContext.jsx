import { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/shared/Toast';

const ToastContext = createContext();

/**
 * Hook para usar el sistema de notificaciones
 * @returns {{ showToast: Function, showSuccess: Function, showError: Function, showWarning: Function, showInfo: Function }}
 */
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast debe usarse dentro de un ToastProvider');
    }
    return context;
};

/**
 * Provider del sistema de notificaciones
 */
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    // Generar ID único
    const generateId = () => `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Mostrar toast genérico
    const showToast = useCallback(({ type = 'info', title, message, duration = 2500 }) => {
        const id = generateId();
        
        setToasts(prev => [...prev, { id, type, title, message, duration }]);

        // Auto-remove después de la duración + animación de salida
        setTimeout(() => {
            removeToast(id);
        }, duration);
    }, []);

    // Remover toast
    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    // Helpers para tipos comunes
    const showSuccess = useCallback((title, message) => {
        showToast({ type: 'success', title, message });
    }, [showToast]);

    const showError = useCallback((title, message) => {
        showToast({ type: 'error', title, message, duration: 4000 }); // Más tiempo para errores
    }, [showToast]);

    const showWarning = useCallback((title, message) => {
        showToast({ type: 'warning', title, message, duration: 3500 });
    }, [showToast]);

    const showInfo = useCallback((title, message) => {
        showToast({ type: 'info', title, message });
    }, [showToast]);

    // Helpers específicos para CRUD (el usuario los puede usar fácilmente)
    const entityCreated = useCallback((entityName) => {
        showSuccess('¡Creado exitosamente!', `${entityName} se ha registrado correctamente`);
    }, [showSuccess]);

    const entityUpdated = useCallback((entityName) => {
        showSuccess('¡Actualizado!', `${entityName} se ha actualizado correctamente`);
    }, [showSuccess]);

    const entityDeleted = useCallback((entityName) => {
        showSuccess('¡Eliminado!', `${entityName} se ha eliminado correctamente`);
    }, [showSuccess]);

    const entityToggled = useCallback((entityName, isActive) => {
        showSuccess(
            isActive ? '¡Activado!' : '¡Desactivado!',
            `${entityName} se ha ${isActive ? 'activado' : 'desactivado'} correctamente`
        );
    }, [showSuccess]);

    const value = {
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        // Helpers CRUD
        entityCreated,
        entityUpdated,
        entityDeleted,
        entityToggled,
        // Para cerrar manualmente
        removeToast
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            {/* Contenedor de toasts */}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
                {toasts.map((toast, index) => (
                    <Toast
                        key={toast.id}
                        {...toast}
                        onClose={() => removeToast(toast.id)}
                        index={index}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export default ToastContext;
