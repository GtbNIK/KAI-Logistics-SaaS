import { Users, DollarSign, CalendarDays } from 'lucide-react';

const EmployeeStatStrip = ({ nominaMes, ultimoPago, activos }) => {
    const formatDate = (d) => {
        if (!d) return '—';
        const date = new Date(d);
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4 flex items-center gap-4">
                <div className="p-2.5 bg-blue-50 rounded-xl shrink-0">
                    <DollarSign size={20} className="text-blue-600" />
                </div>
                <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nómina del Mes</p>
                    <p className="text-xl font-bold text-blue-700 mt-0.5">
                        ${nominaMes.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>
            <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4 flex items-center gap-4">
                <div className="p-2.5 bg-blue-50 rounded-xl shrink-0">
                    <CalendarDays size={20} className="text-blue-600" />
                </div>
                <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Último Pago</p>
                    <p className="text-lg font-bold text-blue-700 mt-0.5 capitalize">
                        {ultimoPago ? formatDate(ultimoPago) : 'Sin pagos'}
                    </p>
                </div>
            </div>
            <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4 flex items-center gap-4">
                <div className="p-2.5 bg-blue-50 rounded-xl shrink-0">
                    <Users size={20} className="text-blue-600" />
                </div>
                <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Empleados Activos</p>
                    <p className="text-xl font-bold text-blue-700 mt-0.5">{activos}</p>
                </div>
            </div>
        </div>
    );
};

export default EmployeeStatStrip;
