import { X, Info } from 'lucide-react';
import { createPortal } from 'react-dom';

/**
 * Modal para mostrar información importante a los usuarios (nuevas funcionalidades, fixes, etc.)
 * Se muestra automáticamente las primeras 3 veces que el usuario accede al dashboard
 * 
 * @param {boolean} isOpen - Controla si el modal está visible
 * @param {function} onClose - Función para cerrar el modal
 * @param {React.ReactNode} icon - Icono a mostrar en la parte superior (componente de lucide-react)
 * @param {string} imageUrl - URL opcional de imagen de fondo para el área del icono
 * @param {string} title - Título del modal
 * @param {React.ReactNode} children - Contenido del modal (puede incluir texto, listas, etc.)
 */
const InformationModal = ({ 
	isOpen, 
	onClose, 
	icon: IconComponent = Info,
	imageUrl = null,
	title = "Información Importante",
	children
}) => {
	// Oculto temporalmente (deshabilitado)
	return null;

	if (!isOpen) return null;

	return createPortal(
		<div 
			className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity" 
			onClick={onClose}
		>
			<div 
				className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all animate-in fade-in zoom-in-95 duration-200" 
				onClick={(e) => e.stopPropagation()}
			>
				
				{/* Área de Icono/Imagen */}
				<div className="relative px-6 pt-8 pb-4">
					<button 
						onClick={onClose}
						className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10"
					>
						<X size={20} />
					</button>
					
					<div className="flex justify-center">
						<div className="relative">
							{/* Cuadrado de fondo para imagen opcional */}
							{imageUrl ? (
								<div 
									className="w-24 h-24 rounded-2xl bg-cover bg-center shadow-lg"
									style={{ backgroundImage: `url(${imageUrl})` }}
								/>
							) : (
								<div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg" />
							)}
							
							{/* Icono flotante */}
							<div className="absolute inset-0 flex items-center justify-center">
								<div className="p-4 bg-white rounded-xl shadow-xl ring-4 ring-white">
									<IconComponent className="text-primary" size={32} strokeWidth={2} />
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Header con título */}
				<div className="px-6 py-2 text-center">
					<h3 className="text-2xl font-bold text-slate-800">{title}</h3>
				</div>

				{/* Contenido */}
				<div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
					<div className="text-slate-600 space-y-3">
						{children}
					</div>
				</div>

				{/* Footer con botón centrado */}
				<div className="flex items-center justify-center px-6 py-5 border-t border-slate-100 bg-slate-50/50">
					<button
						onClick={onClose}
						className="px-8 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
					>
						Cerrar
					</button>
				</div>
			</div>
		</div>,
		document.body
	);
};

export default InformationModal;
