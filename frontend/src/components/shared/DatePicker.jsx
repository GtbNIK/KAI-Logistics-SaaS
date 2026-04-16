import { useState, useEffect, useRef } from 'react';
import { CalendarDays, X, ChevronDown } from 'lucide-react';

const MONTHS_LABELS = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + 1 - i);

const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();

/**
 * Reusable DatePicker component based on the Dashboard date selector pattern.
 * Provides a premium, select-based date picker.
 */
const DatePicker = ({ value, onChange, label = "Seleccionar fecha" }) => {
    const initialDate = value ? new Date(value + 'T12:00:00') : new Date();
    
    const [day, setDay] = useState(initialDate.getDate());
    const [month, setMonth] = useState(initialDate.getMonth() + 1);
    const [year, setYear] = useState(initialDate.getFullYear());
    const [showPopover, setShowPopover] = useState(false);
    
    const popoverRef = useRef(null);
    const lastValueRef = useRef(value);

    // Update internal state when value prop changes (e.g., when loading a quote for editing)
    useEffect(() => {
        if (value && value !== lastValueRef.current) {
            lastValueRef.current = value;
            const date = new Date(value + 'T12:00:00'); // Add time to avoid timezone issues
            setDay(date.getDate());
            setMonth(date.getMonth() + 1);
            setYear(date.getFullYear());
        }
    }, [value]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setShowPopover(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Notify parent on change
    useEffect(() => {
        const date = new Date(year, month - 1, day);
        // Only trigger if date is valid and different from original prop value (avoid infinite loops)
        const isoStr = date.toISOString().split('T')[0];
        if (value !== isoStr) {
            onChange(isoStr);
        }
    }, [day, month, year]);

    const days = Array.from({ length: getDaysInMonth(month, year) }, (_, i) => i + 1);

    const formattedDisplay = new Date(year, month - 1, day).toLocaleDateString('es-VE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

    return (
        <div className="relative" ref={popoverRef}>
            <button
                type="button"
                onClick={() => setShowPopover(!showPopover)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:border-primary transition-all shadow-sm text-sm font-medium text-slate-700"
            >
                <CalendarDays size={16} className="text-slate-400" />
                <span>{label}: {formattedDisplay}</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${showPopover ? 'rotate-180' : ''}`} />
            </button>

            {showPopover && (
                <div className="absolute bottom-full mb-2 left-0 z-50 bg-white rounded-xl shadow-2xl border border-slate-100 p-4 w-72 animate-in fade-in zoom-in-95 duration-200 origin-bottom">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Elegir Fecha</span>
                        <button onClick={() => setShowPopover(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={16} />
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Día</label>
                                <select
                                    value={day}
                                    onChange={e => setDay(Number(e.target.value))}
                                    className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                                >
                                    {days.map(d => <option key={d} value={d}>{String(d).padStart(2, '0')}</option>)}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Mes</label>
                                <select
                                    value={month}
                                    onChange={e => {
                                        const m = Number(e.target.value);
                                        setMonth(m);
                                        const max = getDaysInMonth(m, year);
                                        if (day > max) setDay(max);
                                    }}
                                    className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                                >
                                    {MONTHS_LABELS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Año</label>
                                <select
                                    value={year}
                                    onChange={e => {
                                        const y = Number(e.target.value);
                                        setYear(y);
                                        const max = getDaysInMonth(month, y);
                                        if (day > max) setDay(max);
                                    }}
                                    className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                                >
                                    {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>
                        
                        <button
                            type="button"
                            onClick={() => setShowPopover(false)}
                            className="w-full mt-2 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            Confirmar Fecha
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatePicker;
