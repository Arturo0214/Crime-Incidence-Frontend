import axiosInstance from './axiosConfig';

export const getCitizenRequests = async () => {
    try {
        const response = await axiosInstance.get('/citizen-requests');
        return response.data;
    } catch (error) {
        console.error('Error al obtener peticiones ciudadanas:', error);
        throw error;
    }
};

export const createCitizenRequest = async (data) => {
    try {
        const requestData = {
            title: data.title,
            description: data.description,
            requesterName: data.requesterName,
            requesterPhone: data.requesterPhone,
            street: data.street,
            longitude: data.longitude,
            latitude: data.latitude,
            status: data.status || 'Pendiente'
        };
        const response = await axiosInstance.post('/citizen-requests', requestData);
        return response.data;
    } catch (error) {
        console.error('Error al crear petición ciudadana:', error);
        throw error;
    }
};

export const updateCitizenRequestStatus = async (id, status) => {
    try {
        const response = await axiosInstance.patch(`/citizen-requests/${id}/status`, { status });
        return response.data;
    } catch (error) {
        console.error('Error al actualizar estado de petición ciudadana:', error);
        throw error;
    }
};

export const addCitizenRequestComment = async (id, text, author) => {
    try {
        const response = await axiosInstance.post(`/citizen-requests/${id}/comment`, { text, author });
        return response.data;
    } catch (error) {
        console.error('Error al añadir comentario a petición ciudadana:', error);
        throw error;
    }
};

export const deleteCitizenRequest = async (id) => {
    try {
        const response = await axiosInstance.delete(`/citizen-requests/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error al eliminar petición ciudadana:', error);
        throw error;
    }
};

export const getCitizenRequestsByLocation = async (longitude, latitude, radius) => {
    try {
        const response = await axiosInstance.get('/citizen-requests/nearby', {
            params: {
                longitude,
                latitude,
                radius
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error al obtener peticiones ciudadanas cercanas:', error);
        throw error;
    }
};

export const updateCitizenRequest = async (id, data) => {
    try {
        const requestData = {
            title: data.title,
            description: data.description,
            requesterName: data.requesterName,
            requesterPhone: data.requesterPhone,
            street: data.street,
            longitude: data.longitude,
            latitude: data.latitude,
            status: data.status
        };
        const response = await axiosInstance.patch(`/citizen-requests/${id}`, requestData);
        return response.data;
    } catch (error) {
        console.error('Error al actualizar petición ciudadana:', error);
        throw error;
    }
};

export const editCitizenRequestComment = async (requestId, commentId, text) => {
    try {
        const response = await axiosInstance.patch(`/citizen-requests/${requestId}/comment/${commentId}`, { text });
        return response.data;
    } catch (error) {
        console.error('Error al editar comentario:', error);
        throw error;
    }
};

export const deleteCitizenRequestComment = async (requestId, commentId) => {
    try {
        const response = await axiosInstance.delete(`/citizen-requests/${requestId}/comment/${commentId}`);
        return response.data;
    } catch (error) {
        console.error('Error al eliminar comentario:', error);
        throw error;
    }
}; 