import axiosInstance from './axiosConfig';

export const API_URL = process.env.REACT_APP_API_URL || 'https://crime-incidence-backend.onrender.com/api';

export const getAgreements = async () => {
    try {
        console.log('Fetching agreements...');
        const token = localStorage.getItem('token');
        console.log('Token exists:', !!token);

        const response = await axiosInstance.get('/agreements');
        console.log('Agreements response:', response);
        return response.data;
    } catch (error) {
        console.error('Error al obtener acuerdos:', error);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
        }
        throw error;
    }
};

export const getAgreementById = async (id) => {
    try {
        const response = await axiosInstance.get(`/agreements/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error al obtener acuerdo por ID:', error);
        throw error;
    }
};

export const createAgreement = async (data) => {
    try {
        const response = await axiosInstance.post('/agreements', data);
        return response.data;
    } catch (error) {
        console.error('Error al crear acuerdo:', error);
        throw error;
    }
};

export const updateAgreement = async (id, data) => {
    try {
        const token = localStorage.getItem('token');
        console.log('Token en updateAgreement:', token ? 'Existe' : 'No existe');
        console.log('Token completo:', token);

        const response = await axiosInstance.put(`/agreements/${id}`, data);
        return response.data;
    } catch (error) {
        console.error('Error al actualizar acuerdo:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
        throw error;
    }
};

export const deleteAgreement = async (id) => {
    try {
        const response = await axiosInstance.delete(`/agreements/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error al eliminar acuerdo:', error);
        throw error;
    }
};

export const createAgreementsBulk = async (agreementsArray) => {
    try {
        const response = await axiosInstance.post('/agreements/bulk', agreementsArray);
        return response.data;
    } catch (error) {
        console.error('Error al crear acuerdos en bulk:', error);
        throw error;
    }
};

export const addCommentToAgreement = async (id, comment) => {
    try {
        const response = await axiosInstance.post(`/agreements/${id}/comments`, comment);
        return response.data;
    } catch (error) {
        console.error('Error al agregar comentario:', error);
        throw error;
    }
};

export const editCommentInAgreement = async (id, commentIdx, comment) => {
    try {
        const response = await axiosInstance.put(`/agreements/${id}/comments/${commentIdx}`, comment);
        return response.data;
    } catch (error) {
        console.error('Error al editar comentario:', error);
        throw error;
    }
};

export const deleteCommentFromAgreement = async (id, commentIdx) => {
    try {
        const response = await axiosInstance.delete(`/agreements/${id}/comments/${commentIdx}`);
        return response.data;
    } catch (error) {
        console.error('Error al eliminar comentario:', error);
        throw error;
    }
}; 