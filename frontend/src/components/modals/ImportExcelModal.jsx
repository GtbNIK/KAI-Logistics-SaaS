import { useState, useRef } from 'react';
import { X, FileDown, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import clientService from '../../services/client.service';

const ImportExcelModal = ({ isOpen, onClose, onSuccess }) => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState([]);
    const [errors, setErrors] = useState([]);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
            alert('Por favor selecciona un archivo Excel válido (.xlsx o .xls)');
            return;
        }

        setFile(selectedFile);
        setErrors([]);
        setSuccess(false);

        // Leer y previsualizar el archivo
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const workbook = XLSX.read(event.target.result, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(worksheet);
                
                setPreview(data.slice(0, 5)); // Mostrar solo las primeras 5 filas
            } catch (error) {
                console.error('Error reading file:', error);
                alert('Error al leer el archivo');
            }
        };
        reader.readAsBinaryString(selectedFile);
    };

    const handleImport = async () => {
        if (!file) return;

        setLoading(true);
        setErrors([]);
        setSuccess(false);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const workbook = XLSX.read(event.target.result, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(worksheet);

                const importErrors = [];
                let successCount = 0;

                for (let i = 0; i < data.length; i++) {
                    const row = data[i];
                    try {
                        const rawPhone = String(row['Teléfono'] || row['telefono'] || row['Telefono'] || '');
                        // Si el teléfono no comienza con '+' se normaliza asumiendo código de Venezuela (+58)
                        const phone = rawPhone.startsWith('+') ? rawPhone : `+58${rawPhone}`;

                        await clientService.createClient({
                            name: row['Nombre'] || row['nombre'] || '',
                            rifOrId: row['RIF'] || row['rif'] || row['Cédula'] || '',
                            email: row['Email'] || row['email'] || '',
                            phone,
                            contactPerson: row['Contacto'] || row['contacto'] || row['Persona de Contacto'] || '',
                            address: row['Dirección'] || row['direccion'] || row['Direccion'] || '',
                            deliveryAddress: row['Dirección de Entrega'] || row['direccion_entrega'] || row['Direccion Entrega'] || row['Dirección'] || '',
                            referencePoint: row['Referencia'] || row['referencia'] || row['Punto de Referencia'] || ''
                        });
                        successCount++;
                    } catch (error) {
                        importErrors.push({
                            row: i + 2, // +2 porque Excel empieza en 1 y tiene header
                            name: row['Nombre'] || row['nombre'] || 'Sin nombre',
                            error: error.response?.data?.message || 'Error desconocido'
                        });
                    }
                }

                setErrors(importErrors);
                if (successCount > 0) {
                    setSuccess(true);
                    setTimeout(() => {
                        onSuccess();
                        if (importErrors.length === 0) {
                            onClose();
                        }
                    }, 2000);
                }
            } catch (error) {
                console.error('Error importing:', error);
                alert('Error al procesar el archivo');
            } finally {
                setLoading(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const downloadTemplate = () => {
        const template = [
            {
                'Nombre': 'Ejemplo Empresa C.A.',
                'RIF': 'J-12345678-9',
                'Email': 'contacto@ejemplo.com',
                'Teléfono': '+584121234567',
                'Contacto': 'Juan Pérez',
                'Dirección': 'Av. Principal, Edificio X, Piso 5',
                'Dirección de Entrega': 'Av. Principal, Edificio X, Piso 5',
                'Referencia': 'Frente al centro comercial'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
        XLSX.writeFile(wb, 'plantilla_clientes.xlsx');
    };

    const handleClose = () => {
        setFile(null);
        setPreview([]);
        setErrors([]);
        setSuccess(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 sticky top-0 backdrop-blur-md z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-xl">
                            <FileDown className="text-emerald-600" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Importar Clientes desde Excel</h3>
                            <p className="text-sm text-slate-500">Carga masiva de clientes</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleClose}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    
                    {/* Descargar Plantilla */}
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={20} />
                            <div className="flex-1">
                                <p className="text-sm text-blue-800 mb-2">
                                    <strong>Importante:</strong> Descarga la plantilla de Excel para asegurarte de que tus datos tengan el formato correcto.
                                </p>
                                <button
                                    onClick={downloadTemplate}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <FileDown size={16} />
                                    Descargar Plantilla
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Upload Area */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Seleccionar archivo Excel
                        </label>
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-all"
                        >
                            <Upload className="mx-auto text-slate-400 mb-3" size={48} />
                            <p className="text-slate-600 font-medium mb-1">
                                {file ? file.name : 'Haz clic para seleccionar un archivo'}
                            </p>
                            <p className="text-sm text-slate-400">
                                Formatos soportados: .xlsx, .xls
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>
                    </div>

                    {/* Preview */}
                    {preview.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-2">
                                Vista previa (primeras 5 filas)
                            </h4>
                            <div className="overflow-x-auto bg-slate-50 rounded-xl border border-slate-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-100 border-b border-slate-200">
                                        <tr>
                                            {Object.keys(preview[0]).map((key) => (
                                                <th key={key} className="px-4 py-2 text-left text-xs font-semibold text-slate-600">
                                                    {key}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.map((row, i) => (
                                            <tr key={i} className="border-b border-slate-100">
                                                {Object.values(row).map((val, j) => (
                                                    <td key={j} className="px-4 py-2 text-slate-700">
                                                        {String(val)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="p-4 bg-green-50 rounded-xl border border-green-100 flex items-center gap-3">
                            <CheckCircle2 className="text-green-600" size={20} />
                            <p className="text-sm text-green-800">
                                ¡Importación completada exitosamente!
                            </p>
                        </div>
                    )}

                    {/* Errors */}
                    {errors.length > 0 && (
                        <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                            <h4 className="text-sm font-semibold text-red-800 mb-2">
                                Errores encontrados ({errors.length})
                            </h4>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                {errors.map((err, i) => (
                                    <p key={i} className="text-xs text-red-700">
                                        <strong>Fila {err.row}</strong> ({err.name}): {err.error}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                    <button
                        onClick={handleClose}
                        disabled={loading}
                        className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={!file || loading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Importando...
                            </>
                        ) : (
                            <>
                                <Upload size={20} />
                                Importar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportExcelModal;
