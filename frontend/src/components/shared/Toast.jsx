import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

/**
 * Configuración de estilos por tipo
 */
const toastStyles = {
    success: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: CheckCircle,
        iconColor: 'text-green-600',
        titleColor: 'text-green-800',
        messageColor: 'text-green-600',
        progressColor: 'bg-green-500'
    },
    error: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: XCircle,
        iconColor: 'text-red-600',
        titleColor: 'text-red-800',
        messageColor: 'text-red-600',
        progressColor: 'bg-red-500'
    },
    warning: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: AlertTriangle,
        iconColor: 'text-amber-600',
        titleColor: 'text-amber-800',
        messageColor: 'text-amber-600',
        progressColor: 'bg-amber-500'
    },
    info: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: Info,
        iconColor: 'text-blue-600',
        titleColor: 'text-blue-800',
        messageColor: 'text-blue-600',
        progressColor: 'bg-blue-500'
    }
};

/**
 * Componente Toast individual
 */
const Toast = ({ id, type = 'info', title, message, duration = 2500, onClose, index }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    
    const style = toastStyles[type] || toastStyles.info;
    const Icon = style.icon;

    // Animación de entrada
    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    // Animación de salida
    useEffect(() => {
        const leaveTimer = setTimeout(() => {
            setIsLeaving(true);
        }, duration - 300); // 300ms antes de cerrar para la animación

        return () => clearTimeout(leaveTimer);
    }, [duration]);

    // Cerrar manualmente
    const handleClose = () => {
        setIsLeaving(true);
        setTimeout(() => onClose?.(), 300);
    };

    return (
        <div
            className={`
                pointer-events-auto w-80 rounded-xl border shadow-lg overflow-hidden
                transform transition-all duration-300 ease-out
                ${style.bg} ${style.border}
                ${isVisible && !isLeaving 
                    ? 'translate-x-0 opacity-100' 
                    : 'translate-x-full opacity-0'
                }
            `}
            style={{ 
                transitionDelay: `${index * 50}ms`
            }}
        >
            {/* Contenido */}
            <div className="p-4 flex items-start gap-3">
                {/* Icono */}
                <div className={`shrink-0 ${style.iconColor}`}>
                    <Icon size={22} />
                </div>
                
                {/* Texto */}
                <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold ${style.titleColor}`}>
                        {title}
                    </h4>
                    {message && (
                        <p className={`text-sm mt-0.5 ${style.messageColor}`}>
                            {message}
                        </p>
                    )}
                </div>

                {/* Botón cerrar */}
                <button
                    onClick={handleClose}
                    className={`shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors ${style.iconColor}`}
                >
                    <X size={16} />
                </button>
            </div>

            {/* Barra de progreso */}
            <div className="h-1 bg-black/5">
                <div 
                    className={`h-full ${style.progressColor} transition-all ease-linear`}
                    style={{ 
                        width: isVisible && !isLeaving ? '0%' : '100%',
                        transitionDuration: `${duration}ms`
                    }}
                />
            </div>
        </div>
    );
};

export default Toast;
