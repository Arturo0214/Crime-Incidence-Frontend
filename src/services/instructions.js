import axiosInstance from './axiosConfig';

export const getSpecialInstructions = async () => {
    try {
        const response = await axiosInstance.get('/special-instructions');
        return response.data;
    } catch (error) {
        console.error('Error al obtener consignas especiales:', error);
        throw error;
    }
};

export const createSpecialInstruction = async (data) => {
    try {
        const response = await axiosInstance.post('/special-instructions', data);
        return response.data;
    } catch (error) {
        console.error('Error al crear consigna especial:', error);
        throw error;
    }
};

export const updateSpecialInstructionStatus = async (id, status) => {
    try {
        const response = await axiosInstance.patch(`/special-instructions/${id}/status`, { status });
        return response.data;
    } catch (error) {
        console.error('Error al actualizar estado de consigna especial:', error);
        throw error;
    }
};

export const addSpecialInstructionComment = async (id, text, author) => {
    try {
        const response = await axiosInstance.post(`/special-instructions/${id}/comment`, { text, author });
        return response.data;
    } catch (error) {
        console.error('Error al añadir comentario a consigna especial:', error);
        throw error;
    }
};

export const deleteSpecialInstruction = async (id) => {
    try {
        const response = await axiosInstance.delete(`/special-instructions/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error al eliminar consigna especial:', error);
        throw error;
    }
};

export const editSpecialInstructionComment = async (id, commentIdx, text) => {
    try {
        const response = await axiosInstance.put(`/special-instructions/${id}/comment/${commentIdx}`, { text });
        return response.data;
    } catch (error) {
        console.error('Error al editar comentario de consigna especial:', error);
        throw error;
    }
};

export const deleteSpecialInstructionComment = async (id, commentIdx) => {
    try {
        const response = await axiosInstance.delete(`/special-instructions/${id}/comment/${commentIdx}`);
        return response.data;
    } catch (error) {
        console.error('Error al eliminar comentario de consigna especial:', error);
        throw error;
    }
}; 