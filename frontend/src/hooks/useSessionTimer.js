import { useState, useEffect } from 'react';

const useSessionTimer = (sessionExpiresAt, onExpired) => {
    const [secondsLeft, setSecondsLeft] = useState(null);
    const [showWarning, setShowWarning] = useState(false);
    const [warningDismissed, setWarningDismissed] = useState(false);

    useEffect(() => {
        if (!sessionExpiresAt) {
            setSecondsLeft(null);
            return;
        }

        const calculate = () => {
            const now = new Date();
            const expires = new Date(sessionExpiresAt);
            const diff = Math.max(0, Math.floor((expires - now) / 1000));
            return diff;
        };

        // Calcular inmediatamente
        setSecondsLeft(calculate());

        const interval = setInterval(() => {
            const remaining = calculate();
            setSecondsLeft(remaining);

            // 10 minutos = 600 segundos
            if (remaining <= 600 && remaining > 0 && !warningDismissed) {
                setShowWarning(true);
            }

            // Sesión expirada
            if (remaining <= 0) {
                clearInterval(interval);
                onExpired();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [sessionExpiresAt, warningDismissed, onExpired]);

    const dismissWarning = () => {
        setShowWarning(false);
        setWarningDismissed(true);
    };

    const formatTime = (totalSeconds) => {
        if (totalSeconds === null) return '--:--';
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const resetWarning = () => {
        setShowWarning(false);
        setWarningDismissed(false);
    };

    return { secondsLeft, formattedTime: formatTime(secondsLeft), showWarning, dismissWarning, resetWarning };
};

export default useSessionTimer;
