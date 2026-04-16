export const DOOR_TO_DOOR_FLAT_MAX_CBM = 0.16;

export const calculateItemSubtotal = (quantity, unitPrice, serviceType) => {
    const qty = Number(quantity) || 0;
    const price = Number(unitPrice) || 0;

    if (!price) return 0;

    if (serviceType === 'DOOR_TO_DOOR' && qty > 0 && qty < DOOR_TO_DOOR_FLAT_MAX_CBM) {
        return price;
    }

    return qty * price;
};

export const formatQuantityLabel = (quantity, serviceType) => {
    const qty = Number(quantity) || 0;
    if (serviceType === 'DOOR_TO_DOOR') {
        return `${qty} CBM`;
    }
    return `${qty}x`;
};
