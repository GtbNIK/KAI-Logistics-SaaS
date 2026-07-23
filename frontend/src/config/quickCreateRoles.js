/**
 * Effective roles permitidos para crear cada entidad vía QuickCreate.
 *
 * 'ADMIN' = OWNER + ADMIN reales (mapeo de useEffectiveRole)
 * 'SALES' = usuarios con rol SALES
 *
 * Si en el futuro un cliente necesita que SALES cree Puertos, por ejemplo,
 * solo se agrega 'SALES' al array correspondiente. Sin tocar componentes.
 */
export const QUICK_CREATE_ALLOWED_ROLES = {
    AirLine:      ['ADMIN'],
    Country:      ['ADMIN'],
    D2DItem:      ['ADMIN'],
    Port:         ['ADMIN'],
    Service:      ['ADMIN'],
    ShippingLine: ['ADMIN'],
    SvcProvider:  ['ADMIN'],
    Zone:         ['ADMIN'],
};
