import { useState } from 'react';

/**
 * Hook personalizado para controlar la visualización del InformationModal
 * Muestra el modal automáticamente solo las primeras N veces DESPUÉS de iniciar sesión
 * 
 * @param {string} modalKey - Identificador único para el modal (ej: 'dashboard-info-v1')
 * @param {number} maxViews - Número máximo de veces que se mostrará el modal (default: 3)
 * @returns {Object} - { isOpen, closeModal, resetViews }
 */

const useInformationModal = (modalKey, maxViews = 3) => {
	const storageKey = `info_modal_${modalKey}`;

	// Determinar si debemos mostrar el modal en este ciclo de login
	const [isOpen, setIsOpen] = useState(() => {
		const loginSeq = parseInt(sessionStorage.getItem('app_last_login_seq') || '0', 10);
		let record;
		try {
			record = JSON.parse(localStorage.getItem(storageKey) || '{"viewCount":0,"lastShownLoginSeq":0}');
		} catch {
			record = { viewCount: 0, lastShownLoginSeq: 0 };
		}

		if (loginSeq > 0 && record.viewCount < maxViews && record.lastShownLoginSeq !== loginSeq) {
			const next = { viewCount: record.viewCount + 1, lastShownLoginSeq: loginSeq };
			localStorage.setItem(storageKey, JSON.stringify(next));
			return true;
		}
		return false;
	});

	const closeModal = () => {
		setIsOpen(false);
	};

	/**
	 * Función para resetear el contador de vistas (útil para testing o actualizaciones)
	 * Resetea el registro para que vuelva a contarse desde el próximo inicio de sesión.
	 */
	const resetViews = () => {
		localStorage.setItem(storageKey, JSON.stringify({ viewCount: 0, lastShownLoginSeq: 0 }));
		setIsOpen(false);
	};

	return {
		isOpen,
		closeModal,
		resetViews
	};
};

export default useInformationModal;
