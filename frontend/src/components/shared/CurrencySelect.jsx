import Select from 'react-select';
import { Wallet } from 'lucide-react';
import { CURRENCIES, DEFAULT_CURRENCY } from '../../utils/currency';

const currencyOptions = CURRENCIES.map(c => ({
    value: c.code,
    label: `${c.symbol} ${c.name}`,
    symbol: c.symbol,
}));

const selectStyles = {
    control: (base) => ({
        ...base,
        minHeight: '44px',
        borderRadius: '0.75rem',
        borderColor: '#e2e8f0',
        '&:hover': { borderColor: '#3b82f6' },
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden' }),
};

const CurrencySelect = ({ value = DEFAULT_CURRENCY, onChange, disabled = false }) => {
    return (
        <div>
            <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <Wallet size={14} className="text-slate-400" />
                Moneda
            </label>
            <Select
                options={currencyOptions}
                value={currencyOptions.find(o => o.value === value) || null}
                onChange={(opt) => onChange(opt?.value || DEFAULT_CURRENCY)}
                isDisabled={disabled}
                isClearable={false}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                styles={selectStyles}
            />
        </div>
    );
};

export default CurrencySelect;
