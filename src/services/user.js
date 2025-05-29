import axios from './axiosConfig';
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export const register = async (userData) => {
    try {
        const response = await axios.post('/users/register', userData);
        return response.data;
    } catch (error) {
        console.error('Error during registration:', error);
        throw error;
    }
};

export const login = async (credentials) => {
    try {
        const response = await axios.post('/users/login', credentials);
        return response.data;
    } catch (error) {
        console.error('Error during login:', error);
        throw error;
    }
};

export const getUsers = async () => {
    try {
        const response = await axios.get('/users');
        return response.data;
    } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
};

export const deleteUser = async (id) => {
    const response = await axios.delete(`${API_URL}/users/${id}`);
    return response.data;
};

// Utilidad para obtener el usuario actual desde el JWT guardado en localStorage
export const getCurrentUser = () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload;
    } catch {
        return null;
    }
}; 