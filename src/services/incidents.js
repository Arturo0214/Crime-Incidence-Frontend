import axiosInstance from './axiosConfig';

export const getIncidents = async () => {
    try {
        console.log('Fetching incidents from:', '/incidents');
        const response = await axiosInstance.get('/incidents');
        return response.data;
    } catch (error) {
        console.error('Error al obtener incidentes:', error);
        throw error;
    }
};

export const getIncidentsByStreet = async (street) => {
    try {
        console.log('Fetching incidents for street:', street);
        const response = await axiosInstance.get(`/incidents/street/${encodeURIComponent(street)}`);
        return response.data;
    } catch (error) {
        console.error(`Error al obtener incidentes para la calle ${street}:`, error);
        throw error;
    }
};

export const getStatistics = async () => {
    try {
        console.log('Fetching statistics from:', '/incidents/statistics');
        const response = await axiosInstance.get('/incidents/statistics');
        return response.data;
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        throw error;
    }
};

export const getMapData = async () => {
    try {
        console.log('Fetching map data from:', '/incidents/map');
        const response = await axiosInstance.get('/incidents/map');
        return response.data;
    } catch (error) {
        console.error('Error al obtener datos del mapa:', error);
        throw error;
    }
};

export const createIncident = async (incidentData) => {
    try {
        console.log('Creating incident at:', '/incidents');
        const response = await axiosInstance.post('/incidents', incidentData);
        return response.data;
    } catch (error) {
        console.error('Error al crear incidente:', error);
        throw error;
    }
};

export const updateIncident = async (incidentId, updateData) => {
    try {
        console.log('Updating incident:', incidentId, updateData);
        const response = await axiosInstance.put(`/incidents/${incidentId}`, updateData);
        return response.data;
    } catch (error) {
        console.error('Error al actualizar incidente:', error);
        throw error;
    }
};

export const deleteIncident = async (incidentId) => {
    try {
        const response = await axiosInstance.delete(`/incidents/${incidentId}`);
        return response.data;
    } catch (error) {
        console.error('Error al eliminar incidente:', error);
        throw error;
    }
}; 