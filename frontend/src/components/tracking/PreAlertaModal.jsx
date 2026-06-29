import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDropzone } from 'react-dropzone';
import { X, Upload, Trash2, FileWarning, Loader2 } from 'lucide-react';
import { generatePreAlertaPdf } from './preAlertaPdfGenerator';
import { compressImageFile } from '../../utils/imageHelpers';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';

const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const PreAlertaModal = ({ isOpen, onClose, shipment, currentUser }) => {
    const { settings } = useSettings();
    const { showSuccess, showError } = useToast();
    const [images, setImages] = useState([]);
    const [processing, setProcessing] = useState(false);
    const imagesRef = useRef(images);

    useEffect(() => { imagesRef.current = images; }, [images]);

    useEffect(() => {
        return () => {
            imagesRef.current.forEach(img => URL.revokeObjectURL(img.preview));
        };
    }, []);

    const clientName = shipment?.clientName || shipment?.clientRel?.name || 'N/A';

    const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
        if (rejectedFiles.length > 0) {
            rejectedFiles.forEach(({ file, errors }) => {
                const msg = errors.some(e => e.code === 'file-too-large')
                    ? `El archivo ${file.name} pesa más de 5MB.`
                    : `El archivo ${file.name} no es válido.`;
                showError('Archivo rechazado', msg);
            });
        }

        if (acceptedFiles.length === 0) return;

        const availableSlots = MAX_IMAGES - images.length;
        if (availableSlots <= 0) {
            showError('Límite alcanzado', `Máximo ${MAX_IMAGES} imágenes.`);
            return;
        }

        const filesToAdd = acceptedFiles.slice(0, availableSlots);
        if (acceptedFiles.length > availableSlots) {
            showError('Límite alcanzado', `Solo se agregaron ${availableSlots} imágenes. Máximo ${MAX_IMAGES}.`);
        }

        setImages(prev => [...prev, ...filesToAdd.map(file => ({ file, preview: URL.createObjectURL(file) }))]);
    }, [images.length, showError]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        maxSize: MAX_FILE_SIZE,
        disabled: images.length >= MAX_IMAGES || processing,
        multiple: true,
    });

    const removeImage = (index) => {
        setImages(prev => {
            const next = [...prev];
            URL.revokeObjectURL(next[index].preview);
            next.splice(index, 1);
            return next;
        });
    };

    const handleGenerate = async () => {
        if (!shipment) return;
        setProcessing(true);
        try {
            const compressed = await Promise.all(images.map(img => compressImageFile(img.file, 800, 800, 0.5)));
            await generatePreAlertaPdf(shipment, compressed, currentUser, settings);
            showSuccess('PDF generado', 'La pre-alerta se generó correctamente');
            onClose();
        } catch (err) {
            console.error('Error generando pre-alerta:', err);
            showError('Error', 'No se pudo generar el PDF de pre-alerta');
        } finally {
            setProcessing(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-xl">
                            <FileWarning className="text-amber-600" size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Generar Pre-Alerta</h3>
                            <p className="text-xs text-slate-500">PDF de recepción de mercancía</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-6 space-y-6">
                    {/* Confirmación */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <p className="text-sm text-blue-700">
                            Se generará la pre-alerta para el cliente: <strong>{clientName}</strong>
                        </p>
                    </div>

                    {/* Dropzone */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Adjuntar imágenes de la mercancía (opcional) <span className="text-xs font-normal text-slate-400">(máx. {MAX_IMAGES})</span>
                        </label>
                        <div
                            {...getRootProps()}
                            className={`flex flex-col items-center justify-center h-36 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                                isDragActive
                                    ? 'border-amber-400 bg-amber-50 scale-[1.01]'
                                    : 'border-slate-300 hover:border-amber-300 hover:bg-slate-50'
                            } ${images.length >= MAX_IMAGES || processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <input {...getInputProps()} />
                            <Upload size={28} className={`mb-2 ${isDragActive ? 'text-amber-500' : 'text-slate-400'}`} />
                            <p className="text-sm text-slate-500 font-medium">
                                {isDragActive ? 'Suelta las imágenes aquí' : 'Arrastra imágenes o haz clic'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">JPG, PNG — máx. 5MB por imagen</p>
                        </div>
                    </div>

                    {/* Previsualización */}
                    {images.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {images.map((img, idx) => (
                                <div key={idx} className="relative group aspect-square rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                                    <img
                                        src={img.preview}
                                        alt={`preview-${idx}`}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <button
                                            type="button"
                                            onClick={() => removeImage(idx)}
                                            className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div className="absolute top-1 left-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                        {idx + 1}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} disabled={processing}
                        className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50">
                        Cancelar
                    </button>
                    <button onClick={handleGenerate} disabled={processing}
                        style={{ backgroundColor: settings?.primaryColor || '#0ea5e9' }}
                        className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-50">
                        {processing ? <Loader2 size={16} className="animate-spin" /> : <FileWarning size={16} />}
                        {processing ? 'Generando...' : 'Generar PDF'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PreAlertaModal;
