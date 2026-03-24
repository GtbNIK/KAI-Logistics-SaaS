// utils/dateHelpers.js
 
/**
 * Convierte una fecha de input (YYYY-MM-DD) a ISO string con timezone local
 * Evita problemas de timezone al enviar fechas al backend
 */

export const toLocalISOString = (dateString) => {
    if (!dateString) return null;

    // Crear fecha con timezone local para evitar problemas de timezone
    const localDate = new Date(dateString + 'T12:00:00');
    return localDate.toISOString();
}

/**
 * Formatea fecha para mostrar en inputs tipo date
 * Convierte cualquier fecha a formato YYYY-MM-DD
 */

export const toDateString = (date) => {
    if (!date) return '';

    const d = new Date(date);
    //Ajustar por timezone local
    const offset = d.getTimezoneOffset();
    d.setMinutes(d.getMinutes() + offset);
    
    return d.toISOString().split('T')[0];
}

/**
 * Formatea fecha para mostrar en UI (formato Venezuela)
 */
export const toVenezuelanFormat = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('es-VE', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
    });
};
 
/**
 * Obtiene fecha actual en formato YYYY-MM-DD (Venezuela timezone)
 */
export const getTodayLocal = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - (offset * 60000));
    return localDate.toISOString().split('T')[0];
};