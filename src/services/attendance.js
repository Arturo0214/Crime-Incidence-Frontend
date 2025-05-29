import axiosInstance from './axiosConfig';

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export const createAttendance = async (attendanceData) => {
    try {
        console.log('Registrando asistencia en:', '/attendance');
        const response = await axiosInstance.post('/attendance', attendanceData);
        return response.data;
    } catch (error) {
        console.error('Error al registrar asistencia:', error);
        throw error;
    }
};

export const getAttendance = async () => {
    try {
        const response = await axiosInstance.get('/attendance');
        return response.data;
    } catch (error) {
        console.error('Error al obtener asistencias:', error);
        throw error;
    }
};

export const updateAttendance = async (id, data) => {
    try {
        const response = await axiosInstance.put(`/attendance/${id}`, data);
        return response.data;
    } catch (error) {
        console.error('Error al actualizar asistencia:', error);
        throw error;
    }
};

export const deleteAttendance = async (id) => {
    try {
        const response = await axiosInstance.delete(`/attendance/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error al eliminar asistencia:', error);
        throw error;
    }
}; 