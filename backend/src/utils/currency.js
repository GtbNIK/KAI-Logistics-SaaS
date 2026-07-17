const CURRENCY_SYMBOLS = {
    USD: '$',
    ARS: 'AR$',
    EUR: '€',
    GBP: '£',
    BRL: 'R$',
    CNY: '¥',
};

export function getCurrencySymbol(code) {
    return CURRENCY_SYMBOLS[code] || '$';
}

export function formatCurrency(amount, code = 'USD') {
    const symbol = getCurrencySymbol(code);
    const formatted = Number(amount || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return `${symbol} ${formatted}`;
}