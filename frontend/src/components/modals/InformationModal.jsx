import { X, Info, Sparkles, Ship, TrendingUp } from 'lucide-react';
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
	icon: IconComponent = Sparkles,
	imageUrl = null,
	title = "¡Novedades en el Sistema!",
	children: originalChildren
}) => {
	const content = (
		<div className="space-y-4">
			<p className="text-slate-600">
				¡Hola equipo de Import Services! Seguimos mejorando para ti. Aquí tienes los últimos cambios realizados:
			</p>
			<div className="space-y-3">
				<div className="flex gap-3">
					<div className="mt-1 bg-blue-50 p-1.5 rounded-lg h-fit">
						<Ship size={16} className="text-blue-600" />
					</div>
					<div>
						<p className="font-bold text-slate-800 text-sm">Mejoras en Tracking Door to Door</p>
						<p className="text-xs text-slate-600">Ahora el Tiempo de Tránsito (TT) se calcula automáticamente y hemos añadido los campos BL y ETD para los embarques tipo Door to Door.</p>
					</div>
				</div>
				<div className="flex gap-3">
					<div className="mt-1 bg-emerald-50 p-1.5 rounded-lg h-fit">
						<div className="w-4 h-4 bg-emerald-500 rounded-full" />
					</div>
					<div>
						<p className="font-bold text-slate-800 text-sm">Nuevo Estado: ARRIBADO</p>
						<p className="text-xs text-slate-600">Ya puedes marcar tus embarques como "Arribado" para un mejor seguimiento.</p>
					</div>
				</div>
				<div className="flex gap-3">
					<div className="mt-1 bg-purple-50 p-1.5 rounded-lg h-fit">
						<TrendingUp size={16} className="text-purple-600" />
					</div>
					<div>
						<p className="font-bold text-slate-800 text-sm">Optimización y Rendimiento</p>
						<p className="text-xs text-slate-600">Hemos refinado el código interno para que la aplicación sea más rápida y estable.</p>
					</div>
				</div>
			</div>
			<p className="text-xs text-center text-slate-500 pt-2 italic">
				Cada vez seguiremos trabajando para que la experiencia sea aún mejor!
			</p>
		</div>
	);

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
						{content || originalChildren}
					</div>
				</div>

				{/* Footer con botón centrado */}
				<div className="flex items-center justify-center px-6 py-5 border-t border-slate-100 bg-slate-50/50">
					<button
						onClick={onClose}
						className="px-8 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
					>
						¡Entendido!
					</button>
				</div>
			</div>
		</div>,
		document.body
	);
};

export default InformationModal;
