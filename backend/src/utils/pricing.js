/**
 * Constantes de pricing
 */
const DOOR_TO_DOOR_FLAT_MAX_CBM = 0.16;

/**
 * Calcula el subtotal de un item considerando reglas especiales de pricing
 * Para Door-to-Door: si CBM < 0.16, se cobra tarifa plana (no se multiplica)
 * Para otros servicios: subtotal = quantity * unitPrice
 * 
 * @param {string} serviceType - Tipo de servicio (DOOR_TO_DOOR, FCL_20, etc.)
 * @param {number} quantity - Cantidad o CBM
 * @param {number} unitPrice - Precio unitario
 * @returns {number} Subtotal calculado
 */
export const calculateItemSubtotal = (serviceType, quantity, unitPrice) => {
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(unitPrice) || 0;

    // Regla especial para Door-to-Door con CBM bajo
    if (serviceType === 'DOOR_TO_DOOR' && qty > 0 && qty < DOOR_TO_DOOR_FLAT_MAX_CBM) {
        return price; // Tarifa plana, no multiplicar
    }

    // Para todos los demás casos (incluido Door-to-Door con CBM >= 0.16)
    return qty * price;
};
