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

    // Si la fecha es un string en formato YYYY-MM-DD, devolverla directamente
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
    }

    // Si la fecha viene con timestamp (YYYY-MM-DD HH:MM:SS), extraer solo la fecha
    if (typeof date === 'string' && date.includes(' ')) {
        return date.split(' ')[0];
    }

    // Si viene en formato ISO (con T), extraer solo la parte de la fecha
    // Esto preserva la fecha calendario sin importar el timezone
    if (typeof date === 'string' && date.includes('T')) {
        return date.split('T')[0];
    }

    // Para objetos Date, convertir a YYYY-MM-DD local
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

/**
 * Formatea fecha para mostrar en UI (formato Venezuela)
 * Maneja correctamente fechas de la BD que vienen sin timezone
 */
export const toVenezuelanFormat = (dateInput) => {
    if (!dateInput) return '';
    
    let date;
    
    // Si ya es un objeto Date, extraer la fecha local (día, mes, año)
    // y crear un nuevo Date en timezone local para evitar problemas de conversión
    if (dateInput instanceof Date) {
        const year = dateInput.getFullYear();
        const month = dateInput.getMonth();
        const day = dateInput.getDate();
        date = new Date(year, month, day);
    } else if (typeof dateInput === 'string') {
        // Extraer solo la parte de la fecha (YYYY-MM-DD)
        let dateOnly = dateInput;
        if (dateInput.includes(' ')) {
            dateOnly = dateInput.split(' ')[0];
        } else if (dateInput.includes('T')) {
            dateOnly = dateInput.split('T')[0];
        }
        
        // Parsear la fecha como local (no UTC)
        const [year, month, day] = dateOnly.split('-').map(Number);
        date = new Date(year, month - 1, day);
    } else {
        return '';
    }
    
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