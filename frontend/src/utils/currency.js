export const CURRENCIES = [
    { code: 'USD', name: 'Dólares EEUU', symbol: '$' },
    { code: 'ARS', name: 'Pesos Argentinos', symbol: 'AR$' },
    { code: 'EUR', name: 'Euros', symbol: '€' },
    { code: 'GBP', name: 'Libras', symbol: '£' },
    { code: 'BRL', name: 'Reales', symbol: 'R$' },
    { code: 'CNY', name: 'Yuanes', symbol: '¥' },
];

export const DEFAULT_CURRENCY = 'USD';

export function getCurrencySymbol(code) {
    const found = CURRENCIES.find(c => c.code === code);
    return found ? found.symbol : '$';
}

export function formatCurrency(amount, currencyCode = DEFAULT_CURRENCY) {
    const symbol = getCurrencySymbol(currencyCode);
    const formatted = Number(amount || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return `${symbol} ${formatted}`;
}
