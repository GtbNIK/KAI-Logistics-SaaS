import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Hook para abrir automáticamente un modal si existe el parámetro ?id= en la URL
 * @param {Function} onSuccess - Función que recibe la data para abrir el modal
 * @param {Function} fetchCallback - Promesa que retorna la data (ej: id => axios.get(`.../${id}`)) o null/undefined. Si no se provee, pasará solo el id como {id}.
 */
export const useAutoOpenModal = (onSuccess, fetchCallback = null) => {
    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        const entityId = searchParams.get('id');
        if (entityId) {
            // Limpiamos la URL primero
            searchParams.delete('id');
            setSearchParams(searchParams, { replace: true });

            if (fetchCallback) {
                fetchCallback(entityId)
                    .then(res => {
                        // Manejar si devuelve res.data de axios o los datos directos del service
                        const data = res.data ?? res;
                        if (data) onSuccess(data);
                    })
                    .catch(e => console.error('Error auto-opening modal:', e));
            } else {
                // Si no hay fetchCallback, asumimos que al componente le basta el ID (ej: cotizaciones)
                // O los datos se cargan internamente en el componente
                onSuccess({ id: entityId });
            }
        }
    }, [searchParams, setSearchParams]);
};
