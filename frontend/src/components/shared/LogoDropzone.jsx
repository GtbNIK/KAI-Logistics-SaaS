import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Trash2, Image, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const MAX_LOGO_SIZE = 5 * 1024 * 1024;
const ACCEPTED_MIME = 'image/png';

const LogoDropzone = ({ currentUrl, file, onFileChange, onRemove, disabled = false }) => {
    const { showError } = useToast();
    const objectUrlRef = useRef(null);
    const [previewSrc, setPreviewSrc] = useState(null);

    useEffect(() => {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
        }
        if (file) {
            const url = URL.createObjectURL(file);
            objectUrlRef.current = url;
            setPreviewSrc(url);
        } else {
            objectUrlRef.current = null;
            setPreviewSrc(currentUrl || null);
        }
    }, [file, currentUrl]);

    useEffect(() => {
        return () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
            }
        };
    }, []);

    const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
        if (rejectedFiles.length > 0) {
            const { file: rejectedFile, errors } = rejectedFiles[0];
            if (errors.some(e => e.code === 'file-too-large')) {
                showError('Archivo muy grande', `El logo pesa más de 5MB.`);
            } else if (errors.some(e => e.code === 'file-invalid-type')) {
                showError('Formato no válido', 'Solo se permiten archivos PNG.');
            } else {
                showError('Archivo rechazado', `${rejectedFile.name} no es válido.`);
            }
        }
        if (acceptedFiles.length > 0) {
            onFileChange(acceptedFiles[0]);
        }
    }, [onFileChange, showError]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { [ACCEPTED_MIME]: ['.png'] },
        maxSize: MAX_LOGO_SIZE,
        multiple: false,
        disabled,
    });

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <Image size={14} />
                Logo de la Empresa
            </label>
            <p className="text-xs text-slate-400">
                PNG con fondo transparente. Tamaño recomendado: 600×200px. Máx. 5MB.
            </p>

            {previewSrc ? (
                <div className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                    <img
                        src={previewSrc}
                        alt="Logo preview"
                        className="w-full h-40 object-contain p-4"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <button
                            type="button"
                            onClick={onRemove}
                            disabled={disabled}
                            className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                            title="Eliminar logo"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                    <div className="absolute bottom-2 right-2">
                        <span className={`inline-flex items-center gap-1 text-white text-xs px-2 py-0.5 rounded-full font-medium shadow-sm ${
                            file ? 'bg-amber-500' : 'bg-green-500'
                        }`}>
                            {file ? (
                                <><Loader2 size={10} className="animate-spin" /> Sin guardar</>
                            ) : (
                                <><CheckCircle size={10} /> Guardado</>
                            )}
                        </span>
                    </div>
                </div>
            ) : (
                <div
                    {...getRootProps()}
                    className={`flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                        isDragActive
                            ? 'border-primary bg-primary/5 scale-[1.02]'
                            : 'border-slate-300 hover:border-primary/50 hover:bg-slate-50'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <input {...getInputProps()} />
                    <Upload size={28} className={`mb-2 ${isDragActive ? 'text-primary' : 'text-slate-400'}`} />
                    <p className="text-sm text-slate-500 font-medium">
                        {isDragActive ? 'Suelta el logo aquí' : 'Arrastra tu logo o haz clic'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Solo PNG — máx. 5MB</p>
                </div>
            )}
        </div>
    );
};

export default LogoDropzone;